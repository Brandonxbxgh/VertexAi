-- Step 11: Profit stats RPC - pool and user SOL profits (after 90% profit share)
-- Run this in Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION get_profit_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  today_start TIMESTAMPTZ;
  week_start TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
  pool_day DECIMAL(20, 9);
  pool_week DECIMAL(20, 9);
  pool_month DECIMAL(20, 9);
  user_total DECIMAL(20, 9);
  pool_total DECIMAL(20, 9);
  share_pct DECIMAL(10, 6);
  user_day DECIMAL(20, 9);
  user_week DECIMAL(20, 9);
  user_month DECIMAL(20, 9);
BEGIN
  today_start := date_trunc('day', now()) AT TIME ZONE 'UTC';
  week_start := date_trunc('week', now()) AT TIME ZONE 'UTC';
  month_start := date_trunc('month', now()) AT TIME ZONE 'UTC';

  -- Pool profits (SOL) from successful trades
  SELECT COALESCE(SUM(COALESCE(profit_sol, profit_usd / 200)), 0) INTO pool_day
  FROM trades WHERE status = 'success' AND created_at >= today_start;

  SELECT COALESCE(SUM(COALESCE(profit_sol, profit_usd / 200)), 0) INTO pool_week
  FROM trades WHERE status = 'success' AND created_at >= week_start;

  SELECT COALESCE(SUM(COALESCE(profit_sol, profit_usd / 200)), 0) INTO pool_month
  FROM trades WHERE status = 'success' AND created_at >= month_start;

  -- User share (for profit attribution)
  user_total := 0;
  user_day := 0;
  user_week := 0;
  user_month := 0;
  IF uid IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO user_total FROM deposits WHERE user_id = uid;
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO pool_total FROM deposits;

  IF pool_total > 0 AND user_total > 0 THEN
    share_pct := (user_total / pool_total);
    -- User profit = 90% of pool profit × user's share
    user_day := pool_day * 0.9 * share_pct;
    user_week := pool_week * 0.9 * share_pct;
    user_month := pool_month * 0.9 * share_pct;
  ELSE
    share_pct := 0;
    user_day := 0;
    user_week := 0;
    user_month := 0;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'pool', jsonb_build_object(
      'sol_day', pool_day,
      'sol_week', pool_week,
      'sol_month', pool_month
    ),
    'user', jsonb_build_object(
      'sol_day', user_day,
      'sol_week', user_week,
      'sol_month', user_month
    )
  );
END;
$$;
