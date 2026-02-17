"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export function Overview() {
  const [stats, setStats] = useState({
    todayTrades: 0,
    todayPnl: 0,
    weekTrades: 0,
    weekPnl: 0,
    totalTrades: 0,
    totalPnl: 0,
    lastActivity: null as string | null,
  });
  const client = createClient();

  useEffect(() => {
    if (!client) return;
    async function load(c: NonNullable<typeof client>) {
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now);

      const { data: todayTrades } = await c
        .from("trades")
        .select("profit_usd")
        .gte("created_at", todayStart)
        .eq("status", "success");

      const { data: weekTrades } = await c
        .from("trades")
        .select("profit_usd")
        .gte("created_at", weekStart)
        .eq("status", "success");

      const { data: allTrades } = await c
        .from("trades")
        .select("profit_usd")
        .eq("status", "success");

      const todayPnl = todayTrades?.reduce((s, t) => s + (t.profit_usd || 0), 0) ?? 0;
      const weekPnl = weekTrades?.reduce((s, t) => s + (t.profit_usd || 0), 0) ?? 0;
      const totalPnl = allTrades?.reduce((s, t) => s + (t.profit_usd || 0), 0) ?? 0;

      const { data: lastActivity } = await c
        .from("activity_log")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setStats({
        todayTrades: todayTrades?.length ?? 0,
        todayPnl,
        weekTrades: weekTrades?.length ?? 0,
        weekPnl,
        totalTrades: allTrades?.length ?? 0,
        totalPnl,
        lastActivity: lastActivity?.created_at ?? null,
      });
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">P&L Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            title="Total P&L"
            value={`$${stats.totalPnl.toFixed(2)}`}
            subtitle={`${stats.totalTrades} trades all-time`}
            positive={stats.totalPnl >= 0}
          />
          <Card
            title="This Week"
            value={`$${stats.weekPnl.toFixed(2)}`}
            subtitle={`${stats.weekTrades} trades`}
            positive={stats.weekPnl >= 0}
          />
          <Card
            title="Today"
            value={`$${stats.todayPnl.toFixed(2)}`}
            subtitle={`${stats.todayTrades} trades`}
            positive={stats.todayPnl >= 0}
          />
          <Card
            title="Last Activity"
            value={
              stats.lastActivity
                ? new Date(stats.lastActivity).toLocaleTimeString()
                : "—"
            }
            subtitle="bot heartbeat"
          />
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
