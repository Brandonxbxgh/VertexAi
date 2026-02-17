/**
 * Deposit watcher: polls pool wallet for incoming SOL transfers,
 * attributes them to users via deposit_wallets, inserts into deposits table.
 *
 * Run: npm run deposit-watcher
 * Poll interval: 60s default (DEPOSIT_POLL_INTERVAL_MS) to stay within RPC limits.
 *
 * Env: POOL_WALLET (optional, defaults to bot wallet), SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getPublicKey } from "./wallet";
import { config } from "./config";

const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

const POLL_INTERVAL_MS = Number(process.env.DEPOSIT_POLL_INTERVAL_MS) || 60_000;

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getWalletToUserIdMap(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, deposit_wallets");
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    for (const addr of row.deposit_wallets ?? []) {
      map.set(addr.toLowerCase(), row.user_id);
    }
  }
  return map;
}

async function getKnownSignatures(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("deposits")
    .select("tx_signature")
    .limit(5000);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.tx_signature));
}

type Transfer = { source: string; amount: number; mint: string };

function parseNativeSolTransfers(
  tx: { transaction: { message: { instructions: unknown[]; accountKeys?: unknown[] } }; meta: { err: unknown } | null },
  poolAddress: string
): Transfer[] {
  if (tx.meta?.err) return [];
  const transfers: Transfer[] = [];
  const instructions = tx.transaction?.message?.instructions ?? [];
  const accountKeys = tx.transaction?.message?.accountKeys ?? [];
  const pool = poolAddress.toLowerCase();

  const resolveKey = (key: string | number): string => {
    if (typeof key === "string") return key;
    const acc = accountKeys[key as number];
    if (typeof acc === "object" && acc !== null && "pubkey" in acc) {
      return String((acc as { pubkey: string }).pubkey);
    }
    return String(acc ?? "");
  };

  for (const ix of instructions) {
    const parsed = (ix as { parsed?: { type?: string; info?: Record<string, unknown> } }).parsed;
    if (!parsed?.info || parsed.type !== "transfer") continue;

    const info = parsed.info as Record<string, unknown>;
    if (!("lamports" in info)) continue;

    const destKey = resolveKey((info.destination as string) ?? "").toLowerCase();
    if (destKey !== pool) continue;

    const source = String(info.source ?? "").toLowerCase();
    const lamports = Number(info.lamports ?? 0);
    if (source && lamports > 0) {
      transfers.push({
        source,
        amount: lamports / 1e9,
        mint: NATIVE_SOL_MINT,
      });
    }
  }

  return transfers;
}

async function processTransaction(
  connection: Connection,
  supabase: SupabaseClient,
  poolAddress: string,
  walletMap: Map<string, string>,
  knownSigs: Set<string>,
  signature: string
): Promise<void> {
  if (knownSigs.has(signature)) return;
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.transaction) return;

    const transfers = parseNativeSolTransfers(
      tx as Parameters<typeof parseNativeSolTransfers>[0],
      poolAddress
    );
    if (transfers.length === 0) return;

    for (const t of transfers) {
      const userId = walletMap.get(t.source.toLowerCase());
      if (!userId) {
        console.log(`[deposit-watcher] Unattributed: ${signature} from ${t.source} (${t.amount} ${t.mint})`);
        continue;
      }
      try {
        await supabase.from("deposits").insert({
          user_id: userId,
          amount: t.amount,
          mint: t.mint,
          source_wallet: t.source,
          tx_signature: signature,
        });
        console.log(`[deposit-watcher] Credited ${t.amount} ${t.mint} to user from ${t.source}`);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && err.code === "23505") {
          // Unique violation - already processed
        } else {
          console.error("[deposit-watcher] Insert error:", err);
        }
      }
    }
  } catch (err) {
    console.error("[deposit-watcher] Parse error for", signature, err);
  }
}

async function runCycle(
  connection: Connection,
  supabase: SupabaseClient,
  poolAddress: string
): Promise<void> {
  const [walletMap, knownSigs] = await Promise.all([
    getWalletToUserIdMap(supabase),
    getKnownSignatures(supabase),
  ]);

  const poolPubkey = new PublicKey(poolAddress);
  const signatures = await connection.getSignaturesForAddress(poolPubkey, {
    limit: 30,
  });

  for (const { signature } of signatures) {
    await processTransaction(connection, supabase, poolAddress, walletMap, knownSigs, signature);
    knownSigs.add(signature);
  }
}

/**
 * Run the deposit watcher loop. Call this to start (runs forever).
 * Runs in parallel with arbitrage when combined.
 */
export async function runDepositWatcherLoop(): Promise<void> {
  const poolAddress = process.env.POOL_WALLET || getPublicKey();
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[deposit-watcher] SUPABASE_URL/SERVICE_KEY not set - deposit watching disabled");
    return;
  }

  const connection = new Connection(config.solana.rpcUrl);
  console.log("[deposit-watcher] Started. Pool:", poolAddress, "| Poll:", POLL_INTERVAL_MS, "ms");

  while (true) {
    try {
      await runCycle(connection, supabase, poolAddress);
    } catch (err) {
      console.error("[deposit-watcher] Cycle error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// Run when executed directly: npm run deposit-watcher
if (require.main === module) {
  runDepositWatcherLoop().catch(console.error);
}
