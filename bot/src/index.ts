import { Connection } from "@solana/web3.js";
import { config, validateConfig } from "./config";
import { getWallet } from "./wallet";

async function main() {
  console.log("Vertex Bot - Starting...\n");

  validateConfig();
  const wallet = getWallet();
  const connection = new Connection(config.solana.rpcUrl);

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("RPC:", config.solana.rpcUrl);

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  console.log("Phase 1 complete. Wallet and connection ready.");
  console.log("Run 'npm run test-swap' to execute a test swap.");
}

main().catch(console.error);
