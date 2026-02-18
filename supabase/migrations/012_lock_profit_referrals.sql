-- Step 12: Capital lock, profit tracking, reserve, referrals
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Capital lock: deposits locked 90 days
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS lock_until TIMESTAMPTZ;

-- Backfill: existing deposits get lock_until = created_at + 90 days
UPDATE deposits
SET lock_until = created_at + INTERVAL '90 days'
WHERE lock_until IS NULL;

-- 2. User profit tracking (90% to users, 10% platform)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profit_earned DECIMAL(20, 9) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profit_withdrawn DECIMAL(20, 9) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS capital_withdrawn DECIMAL(20, 9) DEFAULT 0;

-- 3. Referral system
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_reward_pct DECIMAL(5, 2) DEFAULT 0;

-- Generate unique referral code from user_id (deterministic, no collisions)
CREATE OR REPLACE FUNCTION generate_referral_code(p_uid UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  uid UUID := COALESCE(p_uid, gen_random_uuid());
  hash TEXT;
  result TEXT;
BEGIN
  hash := upper(substr(md5(uid::text || 'vertex'), 1, 6));
  result := 'VERTEX-' || hash;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill referral codes (unique per user, 8-char hash)
UPDATE user_profiles up
SET referral_code = 'VERTEX-' || upper(substr(md5(up.user_id::text || 'vertex'), 1, 8))
WHERE referral_code IS NULL;

-- 4. Profit credits (per-credit records for audit)
CREATE TABLE IF NOT EXISTS profit_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_sol DECIMAL(20, 9) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  pool_profit_sol DECIMAL(20, 9) NOT NULL,
  user_share_pct DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profit_credits_user_id ON profit_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_credits_created_at ON profit_credits(created_at DESC);

ALTER TABLE profit_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profit_credits"
  ON profit_credits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 5. Platform profit (10% of pool profits)
INSERT INTO settings (key, value) VALUES ('platform_profit_sol', to_jsonb(0::decimal))
ON CONFLICT (key) DO NOTHING;

-- 6. Payout requests: type (profit vs capital)
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'profit'
  CHECK (payout_type IN ('profit', 'capital'));

-- 7. Update handle_new_user to set referred_by from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  referrer_id UUID;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'referral_code';
  referrer_id := NULL;
  IF ref_code IS NOT NULL AND ref_code != '' THEN
    SELECT user_id INTO referrer_id FROM public.user_profiles WHERE referral_code = ref_code LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (user_id, referred_by)
  VALUES (NEW.id, referrer_id)
  ON CONFLICT (user_id) DO UPDATE SET referred_by = EXCLUDED.referred_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
