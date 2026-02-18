# Arbitrage Tuning for 0.15–0.2% Daily Profit

Target: **~0.15–0.2% daily** on pool balance.

## Current Defaults (Relaxed)

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `MIN_PROFIT_BPS` | 25 | 0.25% min profit per trade |
| `SAFETY_BUFFER_BPS` | 8 | 0.08% buffer for execution delay |
| **Required** | **33 bps** | 0.33% total per trade |
| `ARB_SLIPPAGE_BPS` | 60 | 0.6% slippage for fills |
| `MAX_PRICE_IMPACT_PCT` | 0.8 | Max 0.8% impact per leg |
| `POLL_INTERVAL_MS` | 3000 | Scan every 3 seconds |

## If Still No Trades

1. **Lower thresholds further** (add to `.env`):
   ```
   MIN_PROFIT_BPS=15
   SAFETY_BUFFER_BPS=5
   ```

2. **Disable re-quote** (faster execution, more slippage risk):
   ```
   REQUOTE_BEFORE_EXECUTE=false
   ```

3. **Use a better RPC** – Helius, QuickNode, or Triton are faster than public RPC:
   ```
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api_key=YOUR_KEY
   ```

4. **Run a scan** to see if any opportunities exist:
   ```
   npm run arbitrage -- --scan
   ```

## If Too Many Losing Trades

- Increase `MIN_PROFIT_BPS` (e.g. 35–40)
- Increase `SAFETY_BUFFER_BPS` (e.g. 12–15)
- Keep `REQUOTE_BEFORE_EXECUTE=true`
