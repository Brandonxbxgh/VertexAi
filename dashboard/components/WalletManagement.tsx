"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSolanaAddressError } from "@/lib/solana-address";

type UserProfile = {
  id: string;
  user_id: string;
  deposit_wallets: string[];
  withdrawal_wallet: string | null;
};

function truncateAddress(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
}

export function WalletManagement() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [addWallet, setAddWallet] = useState("");
  const [withdrawalWallet, setWithdrawalWallet] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const supabase = createClient();

  async function fetchProfile() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, user_id, deposit_wallets, withdrawal_wallet")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error(error);
      return;
    }

    setProfile(
      data
        ? {
            id: data.id,
            user_id: data.user_id,
            deposit_wallets: data.deposit_wallets ?? [],
            withdrawal_wallet: data.withdrawal_wallet ?? null,
          }
        : {
            id: "",
            user_id: user.id,
            deposit_wallets: [],
            withdrawal_wallet: null,
          }
    );
    if (data?.withdrawal_wallet) setWithdrawalWallet(data.withdrawal_wallet);
  }

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, []);

  async function handleAddDepositWallet() {
    if (!supabase || !addWallet.trim()) return;
    const err = getSolanaAddressError(addWallet.trim());
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }
    setActionLoading("add");
    setMessage(null);
    const { data, error } = await supabase.rpc("add_deposit_wallet", {
      wallet_address: addWallet.trim(),
    });
    setActionLoading(null);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    const result = data as { ok: boolean; error?: string };
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Failed to add wallet" });
      return;
    }
    setMessage({ type: "ok", text: "Deposit wallet added" });
    setAddWallet("");
    fetchProfile();
  }

  async function handleRemoveDepositWallet(wallet: string) {
    if (!supabase) return;
    setActionLoading(wallet);
    setMessage(null);
    const { data, error } = await supabase.rpc("remove_deposit_wallet", {
      wallet_address: wallet,
    });
    setActionLoading(null);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    const result = data as { ok: boolean; error?: string };
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Failed to remove wallet" });
      return;
    }
    setMessage({ type: "ok", text: "Deposit wallet removed" });
    fetchProfile();
  }

  async function handleSetWithdrawalWallet() {
    if (!supabase || !withdrawalWallet.trim()) return;
    const err = getSolanaAddressError(withdrawalWallet.trim());
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }
    setActionLoading("withdrawal");
    setMessage(null);
    const { data, error } = await supabase.rpc("set_withdrawal_wallet", {
      wallet_address: withdrawalWallet.trim(),
    });
    setActionLoading(null);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    const result = data as { ok: boolean; error?: string };
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Failed to set withdrawal wallet" });
      return;
    }
    setMessage({ type: "ok", text: "Withdrawal wallet updated" });
    fetchProfile();
  }

  const addWalletError = addWallet.trim() ? getSolanaAddressError(addWallet.trim()) : null;
  const withdrawalWalletError =
    withdrawalWallet.trim() ? getSolanaAddressError(withdrawalWallet.trim()) : null;

  if (!supabase) return null;
  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="font-semibold">Deposit & withdrawal wallets</h2>
        <p className="mt-4 text-sm text-zinc-500">Loading...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="font-semibold">Deposit & withdrawal wallets</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Deposit wallets attribute incoming funds to your account. Withdrawal wallet is where payouts
        are sent.
      </p>

      {message && (
        <div
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            message.type === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-zinc-400">Deposit wallets</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Add wallets you will deposit from (Phantom, Solflare, etc.). Each wallet can only be
            linked to one account.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Solana address (e.g. 7xKX...)"
              value={addWallet}
              onChange={(e) => {
                setAddWallet(e.target.value);
                setMessage(null);
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                addWalletError
                  ? "border-red-500/50 bg-red-500/5 focus:border-red-500 focus:ring-red-500"
                  : "border-zinc-700 bg-zinc-800/50 focus:border-emerald-500 focus:ring-emerald-500"
              }`}
            />
            <button
              onClick={handleAddDepositWallet}
              disabled={!addWallet.trim() || !!addWalletError || actionLoading !== null}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {actionLoading === "add" ? "Adding..." : "Add"}
            </button>
          </div>
          {addWalletError && (
            <p className="mt-2 text-sm text-red-400">{addWalletError}</p>
          )}
          {profile && profile.deposit_wallets.length > 0 && (
            <ul className="mt-3 space-y-2">
              {profile.deposit_wallets.map((w) => (
                <li
                  key={w}
                  className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-sm"
                >
                  <code className="font-mono text-zinc-300">{truncateAddress(w)}</code>
                  <button
                    onClick={() => handleRemoveDepositWallet(w)}
                    disabled={actionLoading !== null}
                    className="text-xs text-zinc-500 hover:text-red-400 disabled:opacity-50"
                  >
                    {actionLoading === w ? "Removing..." : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-400">Withdrawal wallet</h3>
          <p className="mt-1 text-xs text-zinc-500">Payouts will be sent to this address.</p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Solana address for payouts"
              value={withdrawalWallet}
              onChange={(e) => {
                setWithdrawalWallet(e.target.value);
                setMessage(null);
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                withdrawalWalletError
                  ? "border-red-500/50 bg-red-500/5 focus:border-red-500 focus:ring-red-500"
                  : "border-zinc-700 bg-zinc-800/50 focus:border-emerald-500 focus:ring-emerald-500"
              }`}
            />
            <button
              onClick={handleSetWithdrawalWallet}
              disabled={!withdrawalWallet.trim() || !!withdrawalWalletError || actionLoading !== null}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {actionLoading === "withdrawal" ? "Saving..." : "Save"}
            </button>
          </div>
          {withdrawalWalletError && (
            <p className="mt-2 text-sm text-red-400">{withdrawalWalletError}</p>
          )}
        </div>
      </div>
    </section>
  );
}
