-- Step 2: Deposits table (immutable, append-only)
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(20, 9) NOT NULL,
  mint TEXT NOT NULL,
  source_wallet TEXT NOT NULL,
  tx_signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tx_signature)
);

-- Indexes for share calculation and lookups
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_tx_signature ON deposits(tx_signature);
