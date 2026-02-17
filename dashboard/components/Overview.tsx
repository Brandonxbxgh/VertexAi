"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export function Overview() {
  const [stats, setStats] = useState({
    todayTrades: 0,
    todayPnl: 0,
    lastActivity: null as string | null,
  });
  const client = createClient();

  useEffect(() => {
    if (!client) return;
    async function load(c: NonNullable<typeof client>) {
      const { data: trades } = await c
        .from("trades")
        .select("profit_usd, created_at")
        .gte("created_at", new Date().toISOString().split("T")[0])
        .eq("status", "success");

      const todayPnl = trades?.reduce((s, t) => s + (t.profit_usd || 0), 0) ?? 0;

      const { data: lastActivity } = await c
        .from("activity_log")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setStats({
        todayTrades: trades?.length ?? 0,
        todayPnl,
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
    <div className="grid gap-4 sm:grid-cols-3">
      <Card
        title="Today's Trades"
        value={stats.todayTrades}
        subtitle="executions"
      />
      <Card
        title="Today's P&L"
        value={`$${stats.todayPnl.toFixed(2)}`}
        subtitle={stats.todayPnl >= 0 ? "profit" : "loss"}
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
