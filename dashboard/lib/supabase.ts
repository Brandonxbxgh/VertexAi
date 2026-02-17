export { createClient } from "./supabase/client";

export type ActivityEvent = {
  id: string;
  created_at: string;
  event_type: "scan" | "opportunity" | "executing" | "trade_complete" | "error" | "heartbeat";
  message: string | null;
  data: Record<string, unknown> | null;
  tx_signature: string | null;
};

export type Trade = {
  id: string;
  created_at: string;
  tx_signature: string;
  input_mint: string;
  output_mint: string;
  input_amount: string;
  output_amount: string;
  profit_usd: number | null;
  profit_pct: number | null;
  strategy: string;
  status: string;
};
