-- Step 5: RPC functions for wallet management
-- Run this in Supabase Dashboard → SQL Editor

-- Add deposit wallet (checks not used by another user)
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

  IF normalized = '' OR length(normalized) < 32 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid wallet address');
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

-- Remove deposit wallet
CREATE OR REPLACE FUNCTION remove_deposit_wallet(wallet_address TEXT)
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

  UPDATE user_profiles
  SET deposit_wallets = array_remove(deposit_wallets, normalized)
  WHERE user_id = uid
  AND normalized = ANY(deposit_wallets);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Wallet not found in your list');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Set withdrawal wallet
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

  IF normalized = '' OR length(normalized) < 32 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid wallet address');
  END IF;

  -- Upsert: insert if no profile, update if exists
  INSERT INTO user_profiles (user_id, withdrawal_wallet)
  VALUES (uid, normalized)
  ON CONFLICT (user_id) DO UPDATE SET withdrawal_wallet = normalized;

  RETURN jsonb_build_object('ok', true);
END;
$$;
