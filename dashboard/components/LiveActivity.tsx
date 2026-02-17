"use client";

import { useEffect, useState } from "react";
import { createClient, type ActivityEvent } from "@/lib/supabase";

const EVENT_COLORS: Record<string, string> = {
  scan: "text-zinc-500",
  opportunity: "text-amber-400",
  executing: "text-blue-400",
  trade_complete: "text-emerald-400",
  error: "text-red-400",
  heartbeat: "text-zinc-600",
};

export function LiveActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const client = createClient();

  useEffect(() => {
    if (!client) return;
    async function loadInitial(c: NonNullable<typeof client>) {
      const { data } = await c
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setEvents(data ?? []);
    }
    loadInitial(client);

    const channel = client
      .channel("activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          setEvents((prev) => [payload.new as ActivityEvent, ...prev].slice(0, 100));
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Live Activity</h2>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className="text-xs text-zinc-500">
            {connected ? "Live" : "Connecting..."}
          </span>
        </div>
      </div>
      <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
        {!client ? (
          <p className="py-8 text-center text-sm text-amber-500">
            Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
          </p>
        ) : events.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No activity yet. Start the bot to see live events.
          </p>
        ) : (
          events.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-3 py-2"
            >
              <span className={`text-xs font-medium ${EVENT_COLORS[e.event_type] ?? ""}`}>
                {e.event_type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{e.message ?? "—"}</p>
                {e.tx_signature && (
                  <a
                    href={`https://solscan.io/tx/${e.tx_signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-xs text-emerald-500 hover:underline"
                  >
                    {e.tx_signature.slice(0, 20)}...
                  </a>
                )}
                <p className="mt-0.5 text-xs text-zinc-600">
                  {new Date(e.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
