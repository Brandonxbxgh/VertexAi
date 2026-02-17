/**
 * Payout processor: processes pending payout_requests.
 * Runs every 5 min, sends user's share of pool to their withdrawal_wallet.
 */

import "dotenv/config";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getWallet, getPublicKey } from "./wallet";
import { config } from "./config";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const MIN_PAYOUT_SOL = 0.001; // Skip tiny payouts
const RESERVE_LAMPORTS = 50_000_000; // 0.05 SOL reserve for gas

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function processPayouts(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const connection = new Connection(config.solana.rpcUrl);
  const wallet = getWallet();
  const poolAddress = process.env.POOL_WALLET || getPublicKey();

  const { data: pending } = await supabase
    .from("payout_requests")
    .select("id, user_id")
    .eq("status", "pending")
    .limit(5);

  if (!pending?.length) return;

  const poolBalance = await connection.getBalance(new PublicKey(poolAddress));
  const availableLamports = Math.max(0, poolBalance - RESERVE_LAMPORTS);

  if (availableLamports < MIN_PAYOUT_SOL * 1e9) {
    return;
  }

  const { data: depositsRows } = await supabase.from("deposits").select("user_id, amount");
  const totalDeposits = (depositsRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  if (totalDeposits <= 0) return;

  const { data: payoutsRows } = await supabase.from("payouts").select("user_id, amount_sol");
  const withdrawnByUser = new Map<string, number>();
  for (const r of payoutsRows ?? []) {
    const uid = r.user_id as string;
    if (uid) {
      withdrawnByUser.set(uid, (withdrawnByUser.get(uid) ?? 0) + Number(r.amount_sol ?? 0));
    }
  }

  const userDeposits = new Map<string, number>();
  for (const r of depositsRows ?? []) {
    const uid = r.user_id as string;
    userDeposits.set(uid, (userDeposits.get(uid) ?? 0) + Number(r.amount));
  }

  for (const req of pending) {
    try {
      await supabase
        .from("payout_requests")
        .update({ status: "processing" })
        .eq("id", req.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("withdrawal_wallet")
        .eq("user_id", req.user_id)
        .single();

      const dest = profile?.withdrawal_wallet;
      if (!dest) {
        await supabase
          .from("payout_requests")
          .update({ status: "failed", error_message: "No withdrawal wallet" })
          .eq("id", req.id);
        continue;
      }

      const userTotal = userDeposits.get(req.user_id as string) ?? 0;
      const userWithdrawn = withdrawnByUser.get(req.user_id as string) ?? 0;
      const share = totalDeposits > 0 ? userTotal / totalDeposits : 0;
      const claimSol = (availableLamports / 1e9) * share - userWithdrawn;

      if (claimSol < MIN_PAYOUT_SOL) {
        await supabase
          .from("payout_requests")
          .update({ status: "failed", error_message: "Claim below minimum" })
          .eq("id", req.id);
        continue;
      }

      const lamports = Math.floor(claimSol * 1e9);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(dest),
          lamports,
        })
      );

      const sig = await connection.sendTransaction(tx, [wallet], { skipPreflight: false });
      await connection.confirmTransaction(sig);

      await supabase
        .from("payout_requests")
        .update({
          status: "completed",
          amount_sol: claimSol,
          tx_signature: sig,
          processed_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      await supabase.from("payouts").insert({
        user_id: req.user_id,
        tx_signature: sig,
        amount_sol: claimSol,
        amount_usd: claimSol * 200, // rough USD estimate
        amount_usdc: null,
        destination_wallet: dest,
        status: "completed",
      });

      console.log(`[payout] Sent ${claimSol.toFixed(4)} SOL to ${dest.slice(0, 8)}...`);
    } catch (err) {
      console.error("[payout] Error:", err);
      await supabase
        .from("payout_requests")
        .update({
          status: "failed",
          error_message: String(err),
          processed_at: new Date().toISOString(),
        })
        .eq("id", req.id);
    }
  }
}

export async function runPayoutProcessorLoop(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[payout-processor] Supabase not configured - payouts disabled");
    return;
  }

  console.log("[payout-processor] Started. Poll:", POLL_INTERVAL_MS / 1000, "s");

  while (true) {
    try {
      await processPayouts();
    } catch (err) {
      console.error("[payout-processor] Cycle error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}
