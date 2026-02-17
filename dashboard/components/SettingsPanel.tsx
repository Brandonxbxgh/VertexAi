"use client";

export function SettingsPanel() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="font-semibold">Bot configuration</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Bot settings are managed via the <code className="rounded bg-zinc-800 px-1">.env</code> file
          in <code className="rounded bg-zinc-800 px-1">vertex/bot</code>.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="font-medium text-zinc-400">TRADE_SIZE_LAMPORTS</p>
            <p className="text-zinc-500">0.01 SOL default (10_000_000 lamports)</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="font-medium text-zinc-400">MIN_PROFIT_BPS</p>
            <p className="text-zinc-500">100 = 1% min profit to execute</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="font-medium text-zinc-400">POLL_INTERVAL_MS</p>
            <p className="text-zinc-500">5000 = check every 5 seconds</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="font-semibold">Run the bot</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Start the arbitrage bot from the terminal:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300">
{`cd vertex/bot
& "C:\\Program Files\\nodejs\\node.exe" node_modules/ts-node/dist/bin.js src/arbitrage.ts`}
        </pre>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="font-semibold">Supabase</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Ensure the bot has <code className="rounded bg-zinc-800 px-1">SUPABASE_URL</code> and{" "}
          <code className="rounded bg-zinc-800 px-1">SUPABASE_SERVICE_KEY</code> in its .env to send
          live data to this dashboard.
        </p>
      </section>
    </div>
  );
}
