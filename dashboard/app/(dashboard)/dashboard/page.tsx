import { OverviewTabs } from "@/components/OverviewTabs";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-8 py-5">
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-zinc-500">Your stats, pool stats, and deposits</p>
      </header>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <OverviewTabs />
      </div>
    </div>
  );
}
