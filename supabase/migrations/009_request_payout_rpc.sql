-- Step 9: Request payout RPC
-- Run this in Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION request_payout()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  ww TEXT;
  req_id UUID;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT withdrawal_wallet INTO ww
  FROM user_profiles
  WHERE user_id = uid;

  IF ww IS NULL OR ww = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Set your withdrawal wallet in Settings first');
  END IF;

  INSERT INTO payout_requests (user_id, status)
  VALUES (uid, 'pending')
  RETURNING id INTO req_id;

  RETURN jsonb_build_object('ok', true, 'request_id', req_id);
END;
$$;
