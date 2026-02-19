import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { config } from "./config";

// Solana mainnet token mints
export const MINT = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
} as const;

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  routePlan?: unknown[];
}

const JUPITER_TIMEOUT_MS = 25_000; // 25s - Jupiter can be slow from EU; avoid hanging

/** Retry fetch on transient network/DNS errors. Timeout to avoid hanging. */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), JUPITER_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (e) {
      clearTimeout(timeoutId);
      lastErr = e;
      const msg = String((e as Error).message ?? e);
      const isRetryable =
        msg.includes("ENOTFOUND") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("fetch failed") ||
        msg.includes("abort");
      if (!isRetryable || i === maxRetries - 1) throw e;
      // Longer backoff on abort (timeout) - Jupiter may be slow or rate-limiting
      const delay = msg.includes("abort") ? 4000 * (i + 1) : 2000 * (i + 1);
      console.warn(`Jupiter fetch failed (${msg}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps?: number
): Promise<JupiterQuote | null> {
  const bps = slippageBps ?? config.jupiter.slippageBps;
  const url = new URL(config.jupiter.quoteUrl);
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amount);
  url.searchParams.set("slippageBps", String(bps));

  const headers: Record<string, string> = {};
  if (config.jupiter.apiKey) {
    headers["x-api-key"] = config.jupiter.apiKey;
  }
  const res = await fetchWithRetry(url.toString(), { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Jupiter quote error:", err);
    return null;
  }
  return res.json() as Promise<JupiterQuote | null>;
}

export interface JupiterSwapResult {
  swapTransaction: string; // base64
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
}

export async function getSwapTransaction(
  quoteResponse: JupiterQuote,
  userPublicKey: string
): Promise<JupiterSwapResult | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.jupiter.apiKey) {
    headers["x-api-key"] = config.jupiter.apiKey;
  }
  const res = await fetchWithRetry(config.jupiter.swapUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Jupiter swap build error:", err);
    return null;
  }
  return res.json() as Promise<JupiterSwapResult | null>;
}

export async function executeSwap(
  connection: Connection,
  wallet: Keypair,
  quoteResponse: JupiterQuote
): Promise<string | null> {
  const swapResult = await getSwapTransaction(
    quoteResponse,
    wallet.publicKey.toBase58()
  );
  if (!swapResult?.swapTransaction) return null;

  const txBuffer = Buffer.from(swapResult.swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(new Uint8Array(txBuffer));
  tx.sign([wallet]);

  const sig = await connection.sendTransaction(tx, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });

  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}
