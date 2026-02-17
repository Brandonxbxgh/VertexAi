import { TradesTable } from "@/components/TradesTable";

export default function TradesPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-8 py-5">
        <h1 className="text-xl font-semibold">Trades</h1>
        <p className="text-sm text-zinc-500">Full trade history</p>
      </header>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <TradesTable />
      </div>
    </div>
  );
}
