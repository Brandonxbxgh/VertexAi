"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BalanceData = {
  total_deposited: number;
  pool_total: number;
  share_pct: number;
  profit_available: number;
  capital_available: number;
  earliest_unlock: string | null;
  referral_code: string | null;
};

type ProfitStats = {
  pool: { sol_day: number; sol_week: number; sol_month: number };
  user: { sol_day: number; sol_week: number; sol_month: number };
};

type Deposit = {
  id: string;
  amount: number;
  mint: string;
  source_wallet: string;
  created_at: string;
  lock_until?: string | null;
};

type PayoutRequest = {
  id: string;
  status: string;
  amount_sol: number | null;
  tx_signature: string | null;
  payout_type?: string;
  created_at: string;
  processed_at: string | null;
};

function truncateAddress(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
}

export function BalanceCard() {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const client = createClient();

  async function load() {
    if (!client) return;
    const { data: balanceData, error: balanceError } = await client.rpc("get_my_balance");
    const { data: profitData } = await client.rpc("get_profit_stats");
    const profitResult = profitData as { ok?: boolean; pool?: ProfitStats["pool"]; user?: ProfitStats["user"] };
    if (profitResult?.ok && profitResult.pool && profitResult.user) {
      setProfitStats({ pool: profitResult.pool, user: profitResult.user });
    }
    if (balanceError) {
      console.error(balanceError);
      setLoading(false);
      return;
    }
    const result = balanceData as {
      ok: boolean;
      total_deposited?: number;
      pool_total?: number;
      share_pct?: number;
      profit_available?: number;
      capital_available?: number;
      earliest_unlock?: string | null;
      referral_code?: string | null;
    };
    if (result.ok && result.total_deposited !== undefined) {
      setBalance({
        total_deposited: Number(result.total_deposited),
        pool_total: Number(result.pool_total ?? 0),
        share_pct: Number(result.share_pct ?? 0),
        profit_available: Number(result.profit_available ?? 0),
        capital_available: Number(result.capital_available ?? 0),
        earliest_unlock: result.earliest_unlock ?? null,
        referral_code: result.referral_code ?? null,
      });
    }

    const { data: { user } } = await client.auth.getUser();
    if (user) {
      const { data: depositsData } = await client
        .from("deposits")
        .select("id, amount, mint, source_wallet, created_at, lock_until")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setDeposits((depositsData ?? []).map((d) => ({ ...d, amount: Number(d.amount) })));

      const { data: payoutData } = await client
        .from("payout_requests")
        .select("id, status, amount_sol, tx_signature, payout_type, created_at, processed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setPayoutRequests(
        (payoutData ?? []).map((p) => ({
          ...p,
          amount_sol: p.amount_sol != null ? Number(p.amount_sol) : null,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRequestProfitPayout() {
    if (!client) return;
    setPayoutLoading(true);
    setMessage(null);
    const { data, error } = await client.rpc("request_profit_payout");
    setPayoutLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    const result = data as { ok: boolean; error?: string };
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Failed to request payout" });
      return;
    }
    setMessage({ type: "ok", text: "Profit payout requested. The bot will process it shortly." });
    load();
  }

  async function handleRequestCapitalPayout() {
    if (!client) return;
    setPayoutLoading(true);
    setMessage(null);
    const { data, error } = await client.rpc("request_capital_payout");
    setPayoutLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    const result = data as { ok: boolean; error?: string };
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Failed to request payout" });
      return;
    }
    setMessage({ type: "ok", text: "Capital payout requested. The bot will process it shortly." });
    load();
  }

  if (!client) return null;
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Your balance & share</h2>
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Your balance & share</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-sm text-zinc-500">Total deposited</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">
              {balance?.total_deposited?.toFixed(4) ?? "0"} SOL
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">From your deposit wallets</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-sm text-zinc-500">Pool share</p>
            <p className="mt-1 text-2xl font-semibold">
              {balance?.share_pct?.toFixed(2) ?? "0"}%
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {balance?.pool_total ? `of ${Number(balance.pool_total).toFixed(2)} SOL total` : "No deposits yet"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-sm text-zinc-500">Profit available</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">
              {(balance?.profit_available ?? 0).toFixed(4)} SOL
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">Withdraw anytime</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-sm text-zinc-500">Capital available</p>
            <p className="mt-1 text-2xl font-semibold">
              {(balance?.capital_available ?? 0).toFixed(4)} SOL
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {balance?.earliest_unlock
                ? `Unlocks ${new Date(balance.earliest_unlock).toLocaleDateString()}`
                : "Unlocked (90-day lock passed)"}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleRequestProfitPayout}
          disabled={payoutLoading || (balance?.profit_available ?? 0) < 0.001}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {payoutLoading ? "Requesting..." : "Withdraw profit"}
        </button>
        <button
          onClick={handleRequestCapitalPayout}
          disabled={payoutLoading || (balance?.capital_available ?? 0) < 0.001}
          className="rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500 disabled:opacity-50"
        >
          Withdraw capital
        </button>
        <p className="text-xs text-zinc-500">
          Profit: withdraw anytime. Capital: after 90-day lock. Bot processes pending requests.
        </p>
      </div>

      {payoutRequests.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-500">Payout requests</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30">
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Tx</th>
                </tr>
              </thead>
              <tbody>
                {payoutRequests.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 capitalize">
                      {p.payout_type ?? "profit"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          p.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : p.status === "failed"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-zinc-500/20 text-zinc-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {p.amount_sol != null ? `${p.amount_sol.toFixed(4)} SOL` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.tx_signature ? (
                        <a
                          href={`https://solscan.io/tx/${p.tx_signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deposits.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-500">Deposit history</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30">
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Lock until</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">From</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-400">
                      {d.amount.toFixed(4)} SOL
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {d.lock_until
                        ? new Date(d.lock_until) > new Date()
                          ? new Date(d.lock_until).toLocaleDateString()
                          : "Unlocked"
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-500 text-xs">
                      {truncateAddress(d.source_wallet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
