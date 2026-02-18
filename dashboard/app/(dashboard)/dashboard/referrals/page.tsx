"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReferralData = {
  referral_code: string | null;
  referred_count: number;
  referred_users: { email?: string; created_at: string }[];
};

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const client = createClient();

  useEffect(() => {
    const c = client;
    if (!c) return;
    async function load() {
      const { data: refData } = await c.rpc("get_my_referrals");
      const result = refData as {
        ok?: boolean;
        referral_code?: string;
        referred_count?: number;
        referred_users?: { created_at: string }[];
      };
      if (result?.ok) {
        setData({
          referral_code: result.referral_code ?? null,
          referred_count: result.referred_count ?? 0,
          referred_users: result.referred_users ?? [],
        });
      }
      setLoading(false);
    }
    load();
  }, [client]);

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-amber-400">Supabase not configured</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const signupUrl = typeof window !== "undefined"
    ? `${window.location.origin}/signup${data?.referral_code ? `?ref=${data.referral_code}` : ""}`
    : "";

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Referrals</h1>
      <p className="mt-1 text-sm text-zinc-500">Share your link to invite others</p>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-sm font-medium text-zinc-500">Your referral code</h2>
          <p className="mt-2 font-mono text-lg text-emerald-400">
            {data?.referral_code ?? "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">Share this link:</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={signupUrl}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-300"
            />
            <button
              onClick={() => navigator.clipboard.writeText(signupUrl)}
              className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-sm font-medium text-zinc-500">Referral stats</h2>
          <p className="mt-2 text-2xl font-semibold">{data?.referred_count ?? 0}</p>
          <p className="text-xs text-zinc-600">Users referred</p>
        </div>

        {data?.referred_users && data.referred_users.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <h2 className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-3 text-sm font-medium text-zinc-500">
              Referred users
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 text-left font-medium text-zinc-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.referred_users.map((u, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-6 py-3 text-zinc-300">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
