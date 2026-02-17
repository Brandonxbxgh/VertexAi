/**
 * Test script: Execute a single swap to verify Jupiter integration.
 * Uses a small amount of SOL -> USDC (or USDC -> SOL based on balance).
 *
 * Run: npm run test-swap
 * Ensure your wallet has SOL for gas + some USDC or SOL to swap.
 */

import { Connection } from "@solana/web3.js";
import { config, validateJupiterConfig } from "./config";
import { getWallet } from "./wallet";
import { MINT, getQuote, executeSwap } from "./jupiter";

async function main() {
  console.log("Vertex Bot - Test Swap\n");

  validateJupiterConfig();
  const wallet = getWallet();
  const connection = new Connection(config.solana.rpcUrl);

  // Test: Swap 0.001 SOL -> USDC (1e6 lamports = 0.001 SOL)
  const amountLamports = 1_000_000; // 0.001 SOL
  const amountStr = String(amountLamports);

  console.log("Getting quote: SOL -> USDC (0.001 SOL)...");
  const quote = await getQuote(MINT.SOL, MINT.USDC, amountStr);
  if (!quote) {
    console.error("Failed to get quote. Check RPC and Jupiter API.");
    process.exit(1);
  }

  console.log("Quote received:");
  console.log("  In:", quote.inAmount, "lamports");
  console.log("  Out:", quote.outAmount, "USDC (6 decimals)");
  console.log("  Price impact:", quote.priceImpactPct, "%");

  console.log("\nExecuting swap...");
  const sig = await executeSwap(connection, wallet, quote);
  if (sig) {
    console.log("Swap success:", sig);
    console.log("View: https://solscan.io/tx/" + sig);
  } else {
    console.error("Swap failed.");
  }

  console.log("\nTest complete.");
}

main().catch(console.error);
