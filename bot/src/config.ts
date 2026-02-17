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
    // Trade size: 0.01 SOL per cycle (1e7 lamports)
    tradeSizeLamports: Number(process.env.TRADE_SIZE_LAMPORTS) || 10_000_000,
    // Min profit in basis points (100 = 1%) - strict: only high-conviction trades
    minProfitBps: Number(process.env.MIN_PROFIT_BPS) || 100,
    // Extra buffer required before execution (20 = 0.2%) - accounts for quote staleness
    safetyBufferBps: Number(process.env.SAFETY_BUFFER_BPS) || 20,
    // Max price impact per leg (reject if any leg exceeds this %)
    maxPriceImpactPct: Number(process.env.MAX_PRICE_IMPACT_PCT) || 0.5,
    // Tighter slippage for arb (30 = 0.3%) - less room for unfavorable fills
    slippageBps: Number(process.env.ARB_SLIPPAGE_BPS) || 30,
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
