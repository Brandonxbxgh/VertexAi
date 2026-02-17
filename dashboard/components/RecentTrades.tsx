"use client";

import { useEffect, useState } from "react";
import { createClient, type Trade } from "@/lib/supabase";

const MINT_LABELS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
};

function mintLabel(mint: string) {
  return MINT_LABELS[mint] ?? mint.slice(0, 8);
}

export function RecentTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const client = createClient();

  useEffect(() => {
    if (!client) return;
    async function load(c: NonNullable<typeof client>) {
      const { data } = await c
        .from("trades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setTrades(data ?? []);
    }
    load(client);

    const channel = client
      .channel("trades")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades" },
        (payload) => {
          setTrades((prev) => [payload.new as Trade, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="font-semibold">Recent Trades</h2>
      <div className="mt-4 overflow-x-auto">
        {!client ? (
          <p className="py-8 text-center text-sm text-amber-500">Configure Supabase in .env.local</p>
        ) : trades.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No trades yet. Trades will appear here when the bot executes.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="pb-2 pr-4 font-medium">Time</th>
                <th className="pb-2 pr-4 font-medium">Route</th>
                <th className="pb-2 pr-4 font-medium">Profit</th>
                <th className="pb-2 font-medium">Tx</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 text-zinc-400">
                    {new Date(t.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 pr-4">
                    {mintLabel(t.input_mint)} → {mintLabel(t.output_mint)}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        (t.profit_usd ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      ${(t.profit_usd ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2">
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
