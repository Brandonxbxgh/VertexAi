import { NextResponse } from "next/server";

const DEFAULT_POOL = "7x8Rqqh9RZ1GJ79CYTxTZF743X4VLeVpaYxGPA5foMm1";
const RPC = "https://api.mainnet-beta.solana.com";

export async function GET() {
  const pool = process.env.NEXT_PUBLIC_POOL_ADDRESS || DEFAULT_POOL;
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [pool],
      }),
    });
    const json = await res.json();
    const lamports = json?.result?.value ?? 0;
    const sol = lamports / 1e9;
    return NextResponse.json({ sol, lamports });
  } catch (err) {
    console.error("[pool-balance]", err);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}
