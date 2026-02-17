/**
 * Supabase client for logging to the dashboard.
 * No-ops if SUPABASE_URL / SUPABASE_SERVICE_KEY are not set.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

export type ActivityEventType =
  | "scan"
  | "opportunity"
  | "executing"
  | "trade_complete"
  | "error"
  | "heartbeat";

export async function logActivity(
  eventType: ActivityEventType,
  message: string,
  data?: Record<string, unknown>,
  txSignature?: string
): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.from("activity_log").insert({
      event_type: eventType,
      message,
      data: data ?? null,
      tx_signature: txSignature ?? null,
    });
  } catch (err) {
    console.error("Supabase log error:", err);
  }
}

export async function logTrade(params: {
  txSignature: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  profitUsd?: number;
  profitPct?: number;
  strategy?: string;
  status?: "success" | "failed" | "pending";
  errorMessage?: string;
}): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.from("trades").insert({
      tx_signature: params.txSignature,
      input_mint: params.inputMint,
      output_mint: params.outputMint,
      input_amount: params.inputAmount,
      output_amount: params.outputAmount,
      profit_usd: params.profitUsd ?? null,
      profit_pct: params.profitPct ?? null,
      strategy: params.strategy ?? "triangular_arb",
      status: params.status ?? "success",
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error("Supabase trade log error:", err);
  }
}
