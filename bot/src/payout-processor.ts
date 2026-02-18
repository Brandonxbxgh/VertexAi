/**
 * Payout processor: processes pending payout_requests.
 * Handles profit (withdraw anytime) and capital (after 90-day lock) separately.
 * Uses reserve: only pay out from pool, update profit_withdrawn/capital_withdrawn.
 */

import "dotenv/config";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getWallet, getPublicKey } from "./wallet";
import { config } from "./config";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const MIN_PAYOUT_SOL = 0.001; // Skip tiny payouts
const GAS_RESERVE_LAMPORTS = 50_000_000; // 0.05 SOL for gas

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
    .select("id, user_id, payout_type")
    .eq("status", "pending")
    .limit(5);

  if (!pending?.length) return;

  const poolBalance = await connection.getBalance(new PublicKey(poolAddress));
  const availableLamports = Math.max(0, poolBalance - GAS_RESERVE_LAMPORTS);
  const availableSol = availableLamports / 1e9;

  if (availableSol < MIN_PAYOUT_SOL) return;

  for (const req of pending) {
    try {
      await supabase
        .from("payout_requests")
        .update({ status: "processing" })
        .eq("id", req.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("withdrawal_wallet, profit_earned, profit_withdrawn, capital_withdrawn")
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

      const payoutType = (req.payout_type as string) || "profit";
      let claimSol = 0;

      if (payoutType === "profit") {
        const earned = Number(profile?.profit_earned ?? 0);
        const withdrawn = Number(profile?.profit_withdrawn ?? 0);
        claimSol = Math.max(0, earned - withdrawn);
      } else {
        // capital
        const { data: deposits } = await supabase
          .from("deposits")
          .select("amount, lock_until")
          .eq("user_id", req.user_id);

        let unlockedTotal = 0;
        for (const d of deposits ?? []) {
          const lockUntil = d.lock_until ? new Date(d.lock_until) : null;
          if (!lockUntil || lockUntil <= new Date()) {
            unlockedTotal += Number(d.amount);
          }
        }
        const capWithdrawn = Number(profile?.capital_withdrawn ?? 0);
        claimSol = Math.max(0, unlockedTotal - capWithdrawn);
      }

      if (claimSol < MIN_PAYOUT_SOL) {
        await supabase
          .from("payout_requests")
          .update({ status: "failed", error_message: "Amount below minimum" })
          .eq("id", req.id);
        continue;
      }

      if (claimSol > availableSol) {
        await supabase
          .from("payout_requests")
          .update({ status: "failed", error_message: "Insufficient pool balance" })
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
        amount_usd: claimSol * 200,
        amount_usdc: null,
        destination_wallet: dest,
        status: "completed",
      });

      // Update withdrawn amounts
      if (payoutType === "profit") {
        const { data: p } = await supabase
          .from("user_profiles")
          .select("profit_withdrawn")
          .eq("user_id", req.user_id)
          .single();
        const current = Number(p?.profit_withdrawn ?? 0);
        await supabase
          .from("user_profiles")
          .update({ profit_withdrawn: current + claimSol })
          .eq("user_id", req.user_id);
      } else {
        const { data: p } = await supabase
          .from("user_profiles")
          .select("capital_withdrawn")
          .eq("user_id", req.user_id)
          .single();
        const current = Number(p?.capital_withdrawn ?? 0);
        await supabase
          .from("user_profiles")
          .update({ capital_withdrawn: current + claimSol })
          .eq("user_id", req.user_id);
      }

      availableLamports -= lamports;
      console.log(`[payout] Sent ${claimSol.toFixed(4)} SOL (${payoutType}) to ${dest.slice(0, 8)}...`);
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
