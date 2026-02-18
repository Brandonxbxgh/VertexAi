-- Step 14: Daily profit crediting RPC (called by bot)
-- Run this in Supabase Dashboard → SQL Editor

-- Track last credit time
INSERT INTO settings (key, value) VALUES ('last_profit_credit_at', to_jsonb('1970-01-01'::timestamptz))
ON CONFLICT (key) DO NOTHING;

-- Credit profits: 90% to users by share, 10% to platform
-- Call this daily (or after N trades). Idempotent per period.
CREATE OR REPLACE FUNCTION credit_daily_profits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_at TIMESTAMPTZ;
  pool_profit DECIMAL(20, 9);
  user_share DECIMAL(10, 6);
  user_profit DECIMAL(20, 9);
  platform_share DECIMAL(20, 9);
  pool_total DECIMAL(20, 9);
  r RECORD;
  credited_count INT := 0;
BEGIN
  -- Get last credit time
  SELECT (value #>> '{}')::timestamptz INTO last_at
  FROM settings WHERE key = 'last_profit_credit_at';
  last_at := COALESCE(last_at, '1970-01-01'::timestamptz);

  -- Sum pool profit from trades since last credit
  SELECT COALESCE(SUM(COALESCE(profit_sol, profit_usd / 200)), 0)
  INTO pool_profit
  FROM trades
  WHERE status = 'success' AND created_at > last_at;

  IF pool_profit <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'credited', 0, 'pool_profit', 0);
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO pool_total FROM deposits;
  IF pool_total <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'credited', 0, 'pool_profit', pool_profit);
  END IF;

  platform_share := pool_profit * 0.1;

  -- Credit each user
  FOR r IN
    SELECT user_id, SUM(amount) AS user_deposits
    FROM deposits
    GROUP BY user_id
  LOOP
    user_share := r.user_deposits / pool_total;
    user_profit := pool_profit * 0.9 * user_share;

    IF user_profit > 0 THEN
      UPDATE user_profiles
      SET profit_earned = COALESCE(profit_earned, 0) + user_profit
      WHERE user_id = r.user_id;

      INSERT INTO profit_credits (user_id, amount_sol, period_start, period_end, pool_profit_sol, user_share_pct)
      VALUES (r.user_id, user_profit, last_at, now(), pool_profit, user_share * 100);

      credited_count := credited_count + 1;
    END IF;
  END LOOP;

  -- Update platform profit
  UPDATE settings SET value = to_jsonb(
    COALESCE((value #>> '{}')::decimal, 0) + platform_share
  ) WHERE key = 'platform_profit_sol';

  -- Update last credit time
  UPDATE settings SET value = to_jsonb(now()) WHERE key = 'last_profit_credit_at';

  RETURN jsonb_build_object('ok', true, 'credited', credited_count, 'pool_profit', pool_profit, 'platform_share', platform_share);
END;
$$;
