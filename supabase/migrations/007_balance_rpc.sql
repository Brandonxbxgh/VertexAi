-- Step 7: Balance and share RPC
-- Run this in Supabase Dashboard → SQL Editor

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
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO user_total
  FROM deposits
  WHERE user_id = uid;

  SELECT COALESCE(SUM(amount), 0) INTO pool_total
  FROM deposits;

  IF pool_total > 0 THEN
    share_pct := (user_total / pool_total) * 100;
  ELSE
    share_pct := 0;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'total_deposited', user_total,
    'pool_total', pool_total,
    'share_pct', share_pct
  );
END;
$$;
