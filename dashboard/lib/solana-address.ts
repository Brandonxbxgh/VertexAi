/**
 * Solana address validation.
 * A valid address is Base58-encoded and decodes to exactly 32 bytes.
 */
import bs58 from "bs58";

export function isValidSolanaAddress(address: string): boolean {
  return getSolanaAddressError(address) === null;
}

export function getSolanaAddressError(address: string): string | null {
  const trimmed = address.trim();
  if (trimmed.length === 0) return "Address is required";
  if (trimmed.startsWith("0x")) return "Ethereum addresses (0x...) are not supported. Use a Solana address.";
  if (trimmed.length < 32) return "Address is too short. Solana addresses are 32-44 characters.";
  if (trimmed.length > 44) return "Address is too long. Solana addresses are 32-44 characters.";

  try {
    const decoded = bs58.decode(trimmed);
    if (decoded.length !== 32) {
      return "Invalid address. Must decode to 32 bytes (invalid Base58 or wrong length).";
    }
  } catch {
    return "Invalid Solana address. Not valid Base58 format.";
  }

  return null;
}
