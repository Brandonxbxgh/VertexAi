-- Step 13: Reserve/tradable RPC, extended balance, profit/capital payout RPCs
-- Run this in Supabase Dashboard → SQL Editor

-- Reserve = sum(profit_earned - profit_withdrawn) per user
-- Tradable = pool_balance - total_reserve (fetched by bot from Solana RPC)
CREATE OR REPLACE FUNCTION get_reserve_total()
RETURNS DECIMAL(20, 9)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total DECIMAL(20, 9);
BEGIN
  SELECT COALESCE(SUM(GREATEST(0, COALESCE(profit_earned, 0) - COALESCE(profit_withdrawn, 0))), 0)
  INTO total
  FROM user_profiles;
  RETURN total;
END;
$$;

-- Extended balance: deposits, share, lock, profit available, capital available
CREATE OR REPLACE FUNCTION get_my_balance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  user_total DECIMAL(20, 9);
  pool_total DECIMAL(20, 9);
  share_pct DECIMAL(10, 4);
  profit_avail DECIMAL(20, 9);
  capital_avail DECIMAL(20, 9);
  earliest_unlock TIMESTAMPTZ;
  ref_code TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO user_total
  FROM deposits WHERE user_id = uid;

  SELECT COALESCE(SUM(amount), 0) INTO pool_total
  FROM deposits;

  IF pool_total > 0 THEN
    share_pct := (user_total / pool_total) * 100;
  ELSE
    share_pct := 0;
  END IF;

  -- Profit available = profit_earned - profit_withdrawn
  SELECT COALESCE(profit_earned, 0) - COALESCE(profit_withdrawn, 0)
  INTO profit_avail
  FROM user_profiles WHERE user_id = uid;
  profit_avail := GREATEST(0, COALESCE(profit_avail, 0));

  -- Capital available = sum(unlocked deposits) - capital_withdrawn
  SELECT COALESCE(SUM(CASE WHEN lock_until IS NULL OR lock_until <= now() THEN amount ELSE 0 END), 0)
    - COALESCE((SELECT capital_withdrawn FROM user_profiles WHERE user_id = uid), 0)
  INTO capital_avail
  FROM deposits WHERE user_id = uid;
  capital_avail := GREATEST(0, COALESCE(capital_avail, 0));

  -- Earliest unlock: min(lock_until) for deposits still locked
  SELECT MIN(lock_until) INTO earliest_unlock
  FROM deposits
  WHERE user_id = uid AND lock_until > now();

  SELECT referral_code INTO ref_code FROM user_profiles WHERE user_id = uid;

  RETURN jsonb_build_object(
    'ok', true,
    'total_deposited', user_total,
    'pool_total', pool_total,
    'share_pct', share_pct,
    'profit_available', profit_avail,
    'capital_available', capital_avail,
    'earliest_unlock', earliest_unlock,
    'referral_code', ref_code
  );
END;
$$;

-- Request profit payout (withdraw profit only, no lock)
CREATE OR REPLACE FUNCTION request_profit_payout()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  ww TEXT;
  req_id UUID;
  profit_avail DECIMAL(20, 9);
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT withdrawal_wallet INTO ww FROM user_profiles WHERE user_id = uid;
  IF ww IS NULL OR ww = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Set your withdrawal wallet in Settings first');
  END IF;

  SELECT COALESCE(profit_earned, 0) - COALESCE(profit_withdrawn, 0)
  INTO profit_avail FROM user_profiles WHERE user_id = uid;
  profit_avail := GREATEST(0, COALESCE(profit_avail, 0));

  IF profit_avail <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No profit available to withdraw');
  END IF;

  INSERT INTO payout_requests (user_id, status, payout_type)
  VALUES (uid, 'pending', 'profit')
  RETURNING id INTO req_id;

  RETURN jsonb_build_object('ok', true, 'request_id', req_id);
END;
$$;

-- Request capital payout (withdraw capital only, after lock)
CREATE OR REPLACE FUNCTION request_capital_payout()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  ww TEXT;
  req_id UUID;
  user_deposits DECIMAL(20, 9);
  user_cap_withdrawn DECIMAL(20, 9);
  capital_avail DECIMAL(20, 9);
  has_locked BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT withdrawal_wallet INTO ww FROM user_profiles WHERE user_id = uid;
  IF ww IS NULL OR ww = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Set your withdrawal wallet in Settings first');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO user_deposits FROM deposits WHERE user_id = uid;
  SELECT COALESCE(capital_withdrawn, 0) INTO user_cap_withdrawn FROM user_profiles WHERE user_id = uid;
  capital_avail := user_deposits - user_cap_withdrawn;

  -- Check if any deposits are still locked
  SELECT EXISTS(
    SELECT 1 FROM deposits
    WHERE user_id = uid AND lock_until > now()
  ) INTO has_locked;

  IF has_locked THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Capital is locked for 90 days. Check earliest unlock date.');
  END IF;

  IF capital_avail <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No capital available to withdraw');
  END IF;

  INSERT INTO payout_requests (user_id, status, payout_type)
  VALUES (uid, 'pending', 'capital')
  RETURNING id INTO req_id;

  RETURN jsonb_build_object('ok', true, 'request_id', req_id);
END;
$$;

-- Backward compat: request_payout = request_profit_payout
CREATE OR REPLACE FUNCTION request_payout()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN request_profit_payout();
END;
$$;

-- Referrals: count and list for current user (SECURITY DEFINER can read referred users)
CREATE OR REPLACE FUNCTION get_my_referrals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  ref_code TEXT;
  ref_count INT;
  refs JSONB;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT referral_code INTO ref_code FROM user_profiles WHERE user_id = uid;

  SELECT COUNT(*) INTO ref_count FROM user_profiles WHERE referred_by = uid;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
  INTO refs
  FROM user_profiles WHERE referred_by = uid;

  RETURN jsonb_build_object(
    'ok', true,
    'referral_code', ref_code,
    'referred_count', ref_count,
    'referred_users', refs
  );
END;
$$;
