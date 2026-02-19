"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfitStats = {
  pool: { sol_day: number; sol_week: number; sol_month: number };
  user: { sol_day: number; sol_week: number; sol_month: number };
};

function formatSol(n: number) {
  return `${n.toFixed(4)} SOL`;
}

export function UserProfitStats() {
  const [stats, setStats] = useState<ProfitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const client = createClient();

  useEffect(() => {
    if (!client) return;
    client.rpc("get_profit_stats").then(({ data }) => {
      const result = data as { ok?: boolean; user?: ProfitStats["user"] };
      if (result?.ok && result.user) {
        setStats({ pool: { sol_day: 0, sol_week: 0, sol_month: 0 }, user: result.user });
      }
      setLoading(false);
    });
  }, []);

  if (!client || loading) return null;
  if (!stats) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-zinc-500">Your profits (after 90% share)</h2>
      <p className="mb-4 text-xs text-zinc-600">
        Your share of pool profits (90% to users, 10% platform)
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-zinc-500">Today</p>
          <p className={`mt-1 text-2xl font-semibold ${(stats.user.sol_day ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatSol(stats.user.sol_day ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-zinc-500">This Week</p>
          <p className={`mt-1 text-2xl font-semibold ${(stats.user.sol_week ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatSol(stats.user.sol_week ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-zinc-500">This Month</p>
          <p className={`mt-1 text-2xl font-semibold ${(stats.user.sol_month ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatSol(stats.user.sol_month ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
