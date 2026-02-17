import { ActivityFeed } from "@/components/ActivityFeed";

export default function ActivityPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-8 py-5">
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-zinc-500">Live bot events</p>
      </header>
      <div className="mx-auto max-w-4xl px-8 py-8">
        <ActivityFeed />
      </div>
    </div>
  );
}
