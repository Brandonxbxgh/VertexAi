"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type ProfitStats = {
  pool: { sol_day: number; sol_week: number; sol_month: number };
  user: { sol_day: number; sol_week: number; sol_month: number };
};

function formatSol(n: number) {
  return `${n.toFixed(4)} SOL`;
}

export function Overview() {
  const [stats, setStats] = useState<ProfitStats | null>(null);
  const [tradeCounts, setTradeCounts] = useState({
    today: 0,
    week: 0,
    total: 0,
  });
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

      const { data: profitData } = await c.rpc("get_profit_stats");
      const result = profitData as { ok?: boolean; pool?: ProfitStats["pool"]; user?: ProfitStats["user"] };
      if (result?.ok && result.pool && result.user) {
        setStats({
          pool: result.pool,
          user: result.user,
        });
      }

      const { count: todayCount } = await c
        .from("trades")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString())
        .eq("status", "success");

      const { count: weekCount } = await c
        .from("trades")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekStart.toISOString())
        .eq("status", "success");

      const { count: totalCount } = await c
        .from("trades")
        .select("*", { count: "exact", head: true })
        .eq("status", "success");

      setTradeCounts({
        today: todayCount ?? 0,
        week: weekCount ?? 0,
        total: totalCount ?? 0,
      });

      const { data: last } = await c
        .from("activity_log")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setLastActivity(last?.created_at ?? null);
      setLoading(false);
    }
    load(client);
  }, []);

  if (!client) {
    return (
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-5 text-amber-200">
        <p className="font-medium">Supabase not configured</p>
        <p className="mt-1 text-sm text-amber-200/80">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">P&L Summary</h2>
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Pool profits (total SOL)</h2>
        <p className="mb-4 text-xs text-zinc-600">
          Total pool profits from arbitrage trades before profit share
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            title="Today"
            value={formatSol(stats?.pool.sol_day ?? 0)}
            subtitle={`${tradeCounts.today} trades`}
            positive={(stats?.pool.sol_day ?? 0) >= 0}
          />
          <Card
            title="This Week"
            value={formatSol(stats?.pool.sol_week ?? 0)}
            subtitle={`${tradeCounts.week} trades`}
            positive={(stats?.pool.sol_week ?? 0) >= 0}
          />
          <Card
            title="This Month"
            value={formatSol(stats?.pool.sol_month ?? 0)}
            subtitle={`${tradeCounts.total} trades all-time`}
            positive={(stats?.pool.sol_month ?? 0) >= 0}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Your profits (after 90% share)</h2>
        <p className="mb-4 text-xs text-zinc-600">
          Your share of pool profits (90% to users, 10% platform)
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            title="Today"
            value={formatSol(stats?.user.sol_day ?? 0)}
            subtitle="Your share"
            positive={(stats?.user.sol_day ?? 0) >= 0}
          />
          <Card
            title="This Week"
            value={formatSol(stats?.user.sol_week ?? 0)}
            subtitle="Your share"
            positive={(stats?.user.sol_week ?? 0) >= 0}
          />
          <Card
            title="This Month"
            value={formatSol(stats?.user.sol_month ?? 0)}
            subtitle="Your share"
            positive={(stats?.user.sol_month ?? 0) >= 0}
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

function Card({
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
