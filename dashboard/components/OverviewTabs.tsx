"use client";

import { useState } from "react";
import { BalanceCard } from "./BalanceCard";
import { DepositSection } from "./DepositSection";
import { LiveActivity } from "./LiveActivity";
import { PoolStatsTab } from "./PoolStatsTab";
import { RecentTrades } from "./RecentTrades";
import { UserProfitStats } from "./UserProfitStats";

type TabId = "my-stats" | "pool" | "deposit";

const TABS: { id: TabId; label: string }[] = [
  { id: "my-stats", label: "My Stats" },
  { id: "pool", label: "Pool Stats" },
  { id: "deposit", label: "Deposit" },
];

export function OverviewTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("my-stats");

  return (
    <div>
      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-emerald-500 text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "my-stats" && (
          <div className="space-y-8">
            <BalanceCard />
            <UserProfitStats />
            <div className="grid gap-8 lg:grid-cols-2">
              <LiveActivity />
              <RecentTrades />
            </div>
          </div>
        )}
        {activeTab === "pool" && <PoolStatsTab />}
        {activeTab === "deposit" && <DepositSection />}
      </div>
    </div>
  );
}
