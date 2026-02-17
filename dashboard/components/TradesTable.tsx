"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trade } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const MINT_LABELS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
};

function mintLabel(mint: string) {
  return MINT_LABELS[mint] ?? mint.slice(0, 8);
}

export function TradesTable() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const client = createClient();

  useEffect(() => {
    if (!client) return;
    async function load(c: SupabaseClient) {
      const { data } = await c
        .from("trades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setTrades(data ?? []);
    }
    load(client);

    const channel = client
      .channel("trades")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades" },
        (payload) => {
          setTrades((prev) => [payload.new as Trade, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client]);

  if (!client) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-amber-500">
        Configure Supabase in .env.local
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/30 text-left text-zinc-500">
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Route</th>
              <th className="px-6 py-4 font-medium">In</th>
              <th className="px-6 py-4 font-medium">Out</th>
              <th className="px-6 py-4 font-medium">Profit</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                  No trades yet
                </td>
              </tr>
            ) : (
              trades.map((t) => (
                <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-6 py-3 text-zinc-400">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    {mintLabel(t.input_mint)} → {mintLabel(t.output_mint)}
                  </td>
                  <td className="px-6 py-3 text-zinc-400">{t.input_amount}</td>
                  <td className="px-6 py-3 text-zinc-400">{t.output_amount}</td>
                  <td className="px-6 py-3">
                    <span
                      className={
                        (t.profit_usd ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      ${(t.profit_usd ?? 0).toFixed(2)}
                      {t.profit_pct != null && ` (${t.profit_pct}%)`}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        t.status === "success"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : t.status === "failed"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <a
                      href={`https://solscan.io/tx/${t.tx_signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
