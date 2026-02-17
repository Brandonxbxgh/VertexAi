/**
 * Triangular arbitrage with multiple paths and strict filters.
 * Only executes when profit is clear and all safety checks pass.
 */

import { Connection } from "@solana/web3.js";
import { config } from "./config";
import { getWallet } from "./wallet";
import { MINT, getQuote, executeSwap, JupiterQuote } from "./jupiter";
import { logActivity, logTrade } from "./supabase";
import { sendTelegramAlert } from "./telegram";

const LAMPORTS_PER_SOL = 1e9;

/** A triangle path: 3 legs (input -> mid1 -> mid2 -> back to input) */
export type TrianglePath = {
  name: string;
  legs: [[string, string], [string, string], [string, string]]; // [from, to] per leg
};

/** All triangle paths we scan */
const TRIANGLE_PATHS: TrianglePath[] = [
  // Stables (SOL/USDC/USDT)
  {
    name: "SOL→USDC→USDT→SOL",
    legs: [
      [MINT.SOL, MINT.USDC],
      [MINT.USDC, MINT.USDT],
      [MINT.USDT, MINT.SOL],
    ],
  },
  {
    name: "SOL→USDT→USDC→SOL",
    legs: [
      [MINT.SOL, MINT.USDT],
      [MINT.USDT, MINT.USDC],
      [MINT.USDC, MINT.SOL],
    ],
  },
  // SOL/USDC/BONK
  {
    name: "SOL→USDC→BONK→SOL",
    legs: [
      [MINT.SOL, MINT.USDC],
      [MINT.USDC, MINT.BONK],
      [MINT.BONK, MINT.SOL],
    ],
  },
  {
    name: "SOL→BONK→USDC→SOL",
    legs: [
      [MINT.SOL, MINT.BONK],
      [MINT.BONK, MINT.USDC],
      [MINT.USDC, MINT.SOL],
    ],
  },
  // SOL/USDC/JUP
  {
    name: "SOL→USDC→JUP→SOL",
    legs: [
      [MINT.SOL, MINT.USDC],
      [MINT.USDC, MINT.JUP],
      [MINT.JUP, MINT.SOL],
    ],
  },
  {
    name: "SOL→JUP→USDC→SOL",
    legs: [
      [MINT.SOL, MINT.JUP],
      [MINT.JUP, MINT.USDC],
      [MINT.USDC, MINT.SOL],
    ],
  },
];

export interface ArbitrageOpportunity {
  pathName: string;
  inputLamports: number;
  outputLamports: number;
  profitLamports: number;
  profitBps: number;
  quotes: [JupiterQuote, JupiterQuote, JupiterQuote];
}

/**
 * Check a single triangle path for profitability.
 */
async function checkPath(
  path: TrianglePath,
  inputLamports: number
): Promise<ArbitrageOpportunity | null> {
  const {
    minProfitBps,
    safetyBufferBps,
    maxPriceImpactPct,
    estimatedFeePerTx,
    slippageBps,
  } = config.arbitrage;

  const inputStr = String(inputLamports);

  // Leg 1
  const q1 = await getQuote(path.legs[0][0], path.legs[0][1], inputStr, slippageBps);
  if (!q1) return null;
  if (Math.abs(Number(q1.priceImpactPct)) > maxPriceImpactPct) return null;

  // Leg 2
  const q2 = await getQuote(path.legs[1][0], path.legs[1][1], q1.outAmount, slippageBps);
  if (!q2) return null;
  if (Math.abs(Number(q2.priceImpactPct)) > maxPriceImpactPct) return null;

  // Leg 3
  const q3 = await getQuote(path.legs[2][0], path.legs[2][1], q2.outAmount, slippageBps);
  if (!q3) return null;
  if (Math.abs(Number(q3.priceImpactPct)) > maxPriceImpactPct) return null;

  const outputLamports = Number(q3.outAmount);
  const feeBuffer = estimatedFeePerTx * 3;
  const profitLamports = outputLamports - inputLamports - feeBuffer;
  const profitBps = Math.floor((profitLamports / inputLamports) * 10_000);

  // Strict: must exceed min profit AND safety buffer (for execution delay)
  const requiredBps = minProfitBps + safetyBufferBps;
  if (profitLamports <= 0 || profitBps < requiredBps) {
    return null;
  }

  return {
    pathName: path.name,
    inputLamports,
    outputLamports,
    profitLamports,
    profitBps,
    quotes: [q1, q2, q3],
  };
}

/**
 * Scan all paths and return the best opportunity (if any).
 */
export async function checkAllTriangles(): Promise<ArbitrageOpportunity | null> {
  const { tradeSizeLamports } = config.arbitrage;
  let best: ArbitrageOpportunity | null = null;

  for (const path of TRIANGLE_PATHS) {
    const opp = await checkPath(path, tradeSizeLamports);
    if (opp && (!best || opp.profitBps > best.profitBps)) {
      best = opp;
    }
  }

  return best;
}

/**
 * Re-quote right before execution. Only proceed if still profitable.
 */
async function requoteAndValidate(
  opportunity: ArbitrageOpportunity
): Promise<ArbitrageOpportunity | null> {
  if (!config.arbitrage.reQuoteBeforeExecute) return opportunity;

  const path = TRIANGLE_PATHS.find((p) => p.name === opportunity.pathName);
  if (!path) return null;

  const fresh = await checkPath(path, opportunity.inputLamports);
  if (!fresh || fresh.profitLamports <= 0) {
    return null; // Opportunity gone
  }
  return fresh;
}

/**
 * Execute the 3 swaps in sequence.
 */
export async function executeTriangleArbitrage(
  connection: Connection,
  opportunity: ArbitrageOpportunity
): Promise<string[]> {
  const wallet = getWallet();
  const signatures: string[] = [];

  const legs = opportunity.pathName.split("→");

  for (let i = 0; i < 3; i++) {
    const leg = legs[i] + "→" + legs[(i + 1) % 3];
    const q = opportunity.quotes[i];
    console.log(`  Executing leg ${i + 1}/3: ${leg}...`);
    const sig = await executeSwap(connection, wallet, q);
    if (!sig) {
      throw new Error(`Leg ${i + 1} failed`);
    }
    signatures.push(sig);
    console.log(`  Tx: https://solscan.io/tx/${sig}`);
    await logActivity("trade_complete", `Leg ${i + 1}: ${leg}`, undefined, sig);
    if (i === 2) {
      const profitSol = (opportunity.profitLamports / LAMPORTS_PER_SOL).toFixed(6);
      await sendTelegramAlert(
        `✅ <b>Vertex Trade</b>\n` +
          `Path: ${opportunity.pathName}\n` +
          `Profit: ${profitSol} SOL (${opportunity.profitBps} bps)\n` +
          `Tx: https://solscan.io/tx/${sig}`
      );
    }
    await logTrade({
      txSignature: sig,
      inputMint: q.inputMint,
      outputMint: q.outputMint,
      inputAmount: q.inAmount,
      outputAmount: q.outAmount,
      profitUsd: i === 2 ? (opportunity.profitLamports / LAMPORTS_PER_SOL) * 200 : undefined, // rough USD
      profitPct: i === 2 ? (opportunity.profitBps / 100) : undefined,
      strategy: "triangular_arb",
      status: "success",
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  return signatures;
}

/**
 * Run the arbitrage loop: poll all paths, execute only when strict filters pass.
 */
export async function runArbitrageLoop(): Promise<void> {
  const { validateJupiterConfig } = await import("./config");
  validateJupiterConfig();

  const wallet = getWallet();
  const connection = new Connection(config.solana.rpcUrl);
  const { pollIntervalMs, tradeSizeLamports } = config.arbitrage;

  console.log("Vertex Bot - Triangular Arbitrage (Strict Mode)\n");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Trade size:", tradeSizeLamports / LAMPORTS_PER_SOL, "SOL");
  console.log("Paths:", TRIANGLE_PATHS.map((p) => p.name).join(", "));
  console.log("Filters: re-quote before execute, max price impact, safety buffer");
  console.log("\nScanning for opportunities...\n");

  let cycleCount = 0;

  while (true) {
    cycleCount++;
    try {
      const opp = await checkAllTriangles();
      if (opp) {
        console.log(`[${new Date().toISOString()}] Opportunity: ${opp.pathName}`);
        console.log(
          `  Profit: ${(opp.profitLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL (${opp.profitBps} bps)`
        );
        await logActivity("opportunity", `${opp.pathName}: ${opp.profitBps} bps profit`, {
          pathName: opp.pathName,
          profitBps: opp.profitBps,
          profitLamports: opp.profitLamports,
        });

        // Re-quote before execution (strict)
        const fresh = await requoteAndValidate(opp);
        if (!fresh) {
          console.log("  Skipped: opportunity no longer valid after re-quote.");
          await logActivity("scan", "Opportunity no longer valid after re-quote");
          continue;
        }

        console.log("  Re-quote OK. Executing...");
        await logActivity("executing", `Executing ${fresh.pathName}`);
        const sigs = await executeTriangleArbitrage(connection, fresh);
        console.log("  Done. Signatures:", sigs.join(", "));
        await logActivity("trade_complete", `Triangle complete: ${fresh.pathName}`, {
          signatures: sigs,
          profitLamports: fresh.profitLamports,
        });
        console.log("");
      } else if (cycleCount % 12 === 0) {
        console.log(`[${new Date().toISOString()}] No opportunity (cycle ${cycleCount})`);
        await logActivity("heartbeat", `Scan cycle ${cycleCount} - no opportunity`);
      }
    } catch (err) {
      console.error("Error:", err);
      await logActivity("error", String(err));
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
}

/**
 * One-time scan: check all paths and print best result (no execution).
 */
async function scanOnce(): Promise<void> {
  const { validateJupiterConfig } = await import("./config");
  validateJupiterConfig();

  console.log("Vertex Bot - Arbitrage Scan (strict, all paths)\n");

  const opp = await checkAllTriangles();
  if (opp) {
    console.log("Opportunity found:", opp.pathName);
    console.log("  Input:", opp.inputLamports / LAMPORTS_PER_SOL, "SOL");
    console.log("  Output:", opp.outputLamports / LAMPORTS_PER_SOL, "SOL");
    console.log("  Profit:", opp.profitLamports / LAMPORTS_PER_SOL, "SOL (" + opp.profitBps + " bps)");
  } else {
    console.log("No profitable opportunity (strict filters).");
  }
}

// Run when executed directly
const isScan = process.argv.includes("--scan");
(isScan ? scanOnce() : runArbitrageLoop()).catch(console.error);
