import { LiveActivity } from "@/components/LiveActivity";
import { Overview } from "@/components/Overview";
import { RecentTrades } from "@/components/RecentTrades";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-8 py-5">
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-zinc-500">Bot status and recent activity</p>
      </header>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <Overview />
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <LiveActivity />
          <RecentTrades />
        </div>
      </div>
    </div>
  );
}
