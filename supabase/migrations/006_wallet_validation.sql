-- Step 6b: Add Solana address validation to wallet RPCs
-- Run this in Supabase Dashboard → SQL Editor

-- Solana: Base58, 32-44 chars. Reject 0x (Ethereum), invalid length, invalid chars.
-- Regex equivalent: ^[1-9A-HJ-NP-Za-km-z]{32,44}$

CREATE OR REPLACE FUNCTION add_deposit_wallet(wallet_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  normalized TEXT := trim(wallet_address);
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Solana address validation: 32-44 chars, Base58 (no 0, O, I, l)
  IF length(normalized) < 32 OR length(normalized) > 44 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid Solana address. Must be 32-44 characters.');
  END IF;
  IF normalized ~ '^0x' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ethereum addresses (0x...) are not supported. Use a Solana address.');
  END IF;
  IF normalized !~ '^[1-9A-HJ-NP-Za-km-z]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid Solana address. Use Base58 format (no 0, O, I, l).');
  END IF;

  -- Check if wallet already used by another user
  IF EXISTS (
    SELECT 1 FROM user_profiles up, unnest(up.deposit_wallets) w
    WHERE up.user_id != uid AND w = normalized
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Wallet already registered by another user');
  END IF;

  -- Check if user already has it
  IF EXISTS (
    SELECT 1 FROM user_profiles up, unnest(up.deposit_wallets) w
    WHERE up.user_id = uid AND w = normalized
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Wallet already in your list');
  END IF;

  UPDATE user_profiles
  SET deposit_wallets = array_append(deposit_wallets, normalized)
  WHERE user_id = uid;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION set_withdrawal_wallet(wallet_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  normalized TEXT := trim(wallet_address);
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Solana address validation
  IF length(normalized) < 32 OR length(normalized) > 44 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid Solana address. Must be 32-44 characters.');
  END IF;
  IF normalized ~ '^0x' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ethereum addresses (0x...) are not supported. Use a Solana address.');
  END IF;
  IF normalized !~ '^[1-9A-HJ-NP-Za-km-z]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid Solana address. Use Base58 format (no 0, O, I, l).');
  END IF;

  INSERT INTO user_profiles (user_id, withdrawal_wallet)
  VALUES (uid, normalized)
  ON CONFLICT (user_id) DO UPDATE SET withdrawal_wallet = normalized;

  RETURN jsonb_build_object('ok', true);
END;
$$;
