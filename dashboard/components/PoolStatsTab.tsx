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

function StatCard({
  title,
  value,
  subtitle,
  positive,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-sm text-zinc-500">{title}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-600">{subtitle}</p>
    </div>
  );
}

export function PoolStatsTab() {
  const [stats, setStats] = useState<ProfitStats | null>(null);
  const [poolTotal, setPoolTotal] = useState<number | null>(null);
  const [actualBalance, setActualBalance] = useState<number | null>(null);
  const [tradeCounts, setTradeCounts] = useState({ today: 0, week: 0, total: 0 });
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const client = createClient();

  useEffect(() => {
    if (!client) return;
    async function load(c: NonNullable<typeof client>) {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      const [
        { data: balanceData },
        { data: profitData },
        todayRes,
        weekRes,
        totalRes,
        lastRes,
        balanceRes,
      ] = await Promise.all([
        c.rpc("get_my_balance"),
        c.rpc("get_profit_stats"),
        c.from("trades").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()).eq("status", "success"),
        c.from("trades").select("*", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()).eq("status", "success"),
        c.from("trades").select("*", { count: "exact", head: true }).eq("status", "success"),
        c.from("activity_log").select("created_at").order("created_at", { ascending: false }).limit(1).single(),
        fetch("/api/pool-balance").then((r) => r.json()).catch(() => ({})),
      ]);

      const balanceResult = balanceData as { ok?: boolean; pool_total?: number };
      if (balanceResult?.ok && balanceResult.pool_total !== undefined) {
        setPoolTotal(Number(balanceResult.pool_total));
      }

      const apiBalance = balanceRes as { sol?: number };
      if (typeof apiBalance?.sol === "number") {
        setActualBalance(apiBalance.sol);
      }

      const profitResult = profitData as { ok?: boolean; pool?: ProfitStats["pool"] };
      if (profitResult?.ok && profitResult.pool) {
        setStats({ pool: profitResult.pool, user: { sol_day: 0, sol_week: 0, sol_month: 0 } });
      }

      setTradeCounts({
        today: todayRes.count ?? 0,
        week: weekRes.count ?? 0,
        total: totalRes.count ?? 0,
      });

      setLastActivity((lastRes.data as { created_at?: string } | null)?.created_at ?? null);
      setLoading(false);
    }
    load(client);
  }, []);

  if (!client) {
    return (
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-5 text-amber-200">
        <p className="font-medium">Supabase not configured</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Total pool capital</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-3xl font-semibold text-emerald-400">
              {actualBalance != null ? formatSol(actualBalance) : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              On-chain balance (actual SOL in pool wallet)
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-3xl font-semibold text-zinc-300">
              {poolTotal != null ? formatSol(poolTotal) : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Attributed deposits (determines profit share)
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Pool profits (before 90/10 split)</h2>
        <p className="mb-4 text-xs text-zinc-600">
          Total pool profits from arbitrage trades
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Today"
            value={formatSol(stats?.pool.sol_day ?? 0)}
            subtitle={`${tradeCounts.today} trades`}
            positive={(stats?.pool.sol_day ?? 0) >= 0}
          />
          <StatCard
            title="This Week"
            value={formatSol(stats?.pool.sol_week ?? 0)}
            subtitle={`${tradeCounts.week} trades`}
            positive={(stats?.pool.sol_week ?? 0) >= 0}
          />
          <StatCard
            title="This Month"
            value={formatSol(stats?.pool.sol_month ?? 0)}
            subtitle={`${tradeCounts.total} trades all-time`}
            positive={(stats?.pool.sol_month ?? 0) >= 0}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Bot status</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-zinc-500">Last activity</p>
          <p className="mt-1 text-2xl font-semibold">
            {lastActivity ? new Date(lastActivity).toLocaleTimeString() : "—"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">Bot heartbeat</p>
        </div>
      </div>
    </div>
  );
}
