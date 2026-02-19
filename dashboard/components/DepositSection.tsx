"use client";

import Link from "next/link";
import { useState } from "react";

const DEFAULT_POOL_ADDRESS = "7x8Rqqh9RZ1GJ79CYTxTZF743X4VLeVpaYxGPA5foMm1";

export function DepositSection() {
  const poolAddress =
    process.env.NEXT_PUBLIC_POOL_ADDRESS || DEFAULT_POOL_ADDRESS;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(poolAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(poolAddress)}&margin=10`;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-lg font-semibold">Deposit SOL</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Send SOL from one of your{" "}
        <Link href="/dashboard/settings" className="text-emerald-400 hover:underline">
          deposit wallets
        </Link>{" "}
        to this address. Deposits are credited within ~60 seconds.
      </p>
      <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
        Use a non-custodial wallet (Phantom, Solflare, etc.). Exchanges like Coinbase use shared
        addresses and cannot be attributed correctly.
      </p>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="flex-shrink-0 rounded-lg border border-zinc-700 bg-white p-2">
          <img
            src={qrUrl}
            alt="Pool address QR code"
            width={200}
            height={200}
            className="block"
          />
        </div>

        <div className="flex-1 w-full min-w-0">
          <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Pool address
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
            <code className="flex-1 break-all font-mono text-sm text-zinc-300">
              {poolAddress}
            </code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Native SOL only. Add your sending wallet in Settings first.
          </p>
        </div>
      </div>
    </section>
  );
}
