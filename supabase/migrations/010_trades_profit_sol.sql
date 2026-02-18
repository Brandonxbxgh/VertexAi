-- Step 10: Add profit_sol to trades for SOL-denominated profit display
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS profit_sol DECIMAL(20, 9);

-- Backfill existing rows: profit_usd / 200 ≈ profit_sol (rough SOL price used by bot)
UPDATE trades
SET profit_sol = profit_usd / 200
WHERE profit_sol IS NULL AND profit_usd IS NOT NULL;
