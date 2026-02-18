import "dotenv/config";

export const config = {
  solana: {
    privateKey: process.env.SOLANA_PRIVATE_KEY!,
    rpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  },
  jupiter: {
    apiKey: process.env.JUPITER_API_KEY || "",
    quoteUrl: "https://api.jup.ag/swap/v1/quote",
    swapUrl: "https://api.jup.ag/swap/v1/swap",
    slippageBps: 50, // 0.5%
  },
  arbitrage: {
    // Trade size: dynamic from tradable (pool - reserve), or fixed fallback
    tradeSizeLamports: Number(process.env.TRADE_SIZE_LAMPORTS) || 10_000_000,
    // Dynamic: clamp(tradable * pct, min, max) SOL
    tradeSizePct: Number(process.env.TRADE_SIZE_PCT) || 0.005,
    tradeSizeMinSol: Number(process.env.TRADE_SIZE_MIN_SOL) || 0.01,
    tradeSizeMaxSol: Number(process.env.TRADE_SIZE_MAX_SOL) || 0.5,
    // Min profit in basis points (70 = 0.7%) - relaxed for more opportunities
    minProfitBps: Number(process.env.MIN_PROFIT_BPS) || 70,
    // Extra buffer required before execution (15 = 0.15%)
    safetyBufferBps: Number(process.env.SAFETY_BUFFER_BPS) || 15,
    // Max price impact per leg (reject if any leg exceeds this %)
    maxPriceImpactPct: Number(process.env.MAX_PRICE_IMPACT_PCT) || 0.5,
    // Slippage for arb (40 = 0.4%) - slightly relaxed for more fills
    slippageBps: Number(process.env.ARB_SLIPPAGE_BPS) || 40,
    // Re-quote right before execution; only execute if still profitable
    reQuoteBeforeExecute: process.env.REQUOTE_BEFORE_EXECUTE !== "false",
    // How often to check for opportunities (ms)
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 5000,
    // Est. fee per tx in lamports (~0.00005 SOL)
    estimatedFeePerTx: 50_000,
  },
} as const;

export function validateConfig(): void {
  if (!config.solana.privateKey) {
    throw new Error("SOLANA_PRIVATE_KEY is required. Add it to your .env file.");
  }
}

export function validateJupiterConfig(): void {
  validateConfig();
  if (!config.jupiter.apiKey) {
    throw new Error(
      "JUPITER_API_KEY is required for swap quotes. Get a free key at https://station.jup.ag/"
    );
  }
}
