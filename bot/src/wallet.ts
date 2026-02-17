import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { config, validateConfig } from "./config";

let keypair: Keypair | null = null;

export function getWallet(): Keypair {
  if (!keypair) {
    validateConfig();
    const secretKey = bs58.decode(config.solana.privateKey);
    keypair = Keypair.fromSecretKey(secretKey);
  }
  return keypair;
}

export function getPublicKey(): string {
  return getWallet().publicKey.toBase58();
}
