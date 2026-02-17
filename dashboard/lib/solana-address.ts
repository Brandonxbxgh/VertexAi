/**
 * Solana address validation (Base58, 32-44 chars).
 * Rejects Ethereum (0x), invalid length, invalid characters.
 */
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(address: string): boolean {
  const trimmed = address.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith("0x")) return false; // Ethereum
  return SOLANA_ADDRESS_REGEX.test(trimmed);
}

export function getSolanaAddressError(address: string): string | null {
  const trimmed = address.trim();
  if (trimmed.length === 0) return "Address is required";
  if (trimmed.startsWith("0x")) return "Ethereum addresses (0x...) are not supported. Use a Solana address.";
  if (trimmed.length < 32) return "Address is too short. Solana addresses are 32-44 characters.";
  if (trimmed.length > 44) return "Address is too long. Solana addresses are 32-44 characters.";
  if (!SOLANA_ADDRESS_REGEX.test(trimmed)) return "Invalid format. Solana addresses use Base58 (no 0, O, I, l).";
  return null;
}
