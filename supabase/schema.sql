-- Vertex Platform - Supabase Schema
-- Run this in your Supabase SQL editor to create tables

-- Trades: Every swap executed by the bot
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tx_signature TEXT NOT NULL,
  input_mint TEXT NOT NULL,
  output_mint TEXT NOT NULL,
  input_amount TEXT NOT NULL,
  output_amount TEXT NOT NULL,
  profit_usd DECIMAL(20, 8),
  profit_pct DECIMAL(10, 4),
  strategy TEXT DEFAULT 'triangular_arb',
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT
);

-- Daily snapshots: P&L and balance at end of each day
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  balance_sol DECIMAL(20, 9),
  balance_usdc DECIMAL(20, 6),
  balance_usdt DECIMAL(20, 6),
  total_value_usd DECIMAL(20, 2),
  daily_pnl_usd DECIMAL(20, 2),
  daily_pnl_pct DECIMAL(10, 4),
  trade_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings: Bot configuration (reinvest, payout wallet, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payouts: When profits are sent to designated wallet
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tx_signature TEXT NOT NULL,
  amount_usd DECIMAL(20, 2) NOT NULL,
  amount_sol DECIMAL(20, 9),
  amount_usdc DECIMAL(20, 6),
  destination_wallet TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending'))
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('reinvest_enabled', 'true'),
  ('payout_wallet', '""'),
  ('min_profit_pct', '0.05'),
  ('bot_status', '"stopped"')
ON CONFLICT (key) DO NOTHING;

-- Activity log: Live bot events (scanning, opportunities, executions)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  event_type TEXT NOT NULL CHECK (event_type IN ('scan', 'opportunity', 'executing', 'trade_complete', 'error', 'heartbeat')),
  message TEXT,
  data JSONB,
  tx_signature TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Enable realtime: In Supabase Dashboard → Database → Replication,
-- add activity_log and trades to the supabase_realtime publication.

-- RLS: Allow authenticated read for dashboard (bot uses service key, bypasses RLS)
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read activity_log" ON activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read trades" ON trades FOR SELECT TO authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_snapshots(date DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);
