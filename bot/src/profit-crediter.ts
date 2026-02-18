/**
 * Profit crediter: calls credit_daily_profits RPC periodically.
 * Credits 90% of pool profits to users by share, 10% to platform.
 * Run in parallel with arbitrage.
 */

import "dotenv/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const CREDIT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function creditProfits(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data, error } = await supabase.rpc("credit_daily_profits");
  if (error) {
    console.error("[profit-crediter] Error:", error);
    return;
  }

  const result = data as { ok?: boolean; credited?: number; pool_profit?: number };
  if (result?.ok && (result.credited ?? 0) > 0) {
    console.log(
      `[profit-crediter] Credited ${result.credited} users, pool profit: ${result.pool_profit?.toFixed(4)} SOL`
    );
  }
}

export async function runProfitCrediterLoop(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[profit-crediter] Supabase not configured - profit crediting disabled");
    return;
  }

  console.log("[profit-crediter] Started. Interval:", CREDIT_INTERVAL_MS / 1000 / 3600, "h");

  while (true) {
    try {
      await creditProfits();
    } catch (err) {
      console.error("[profit-crediter] Cycle error:", err);
    }
    await new Promise((r) => setTimeout(r, CREDIT_INTERVAL_MS));
  }
}
