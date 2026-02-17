-- Step 3: Add user_id to payouts table
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE payouts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
