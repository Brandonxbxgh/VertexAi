# Vertex – Getting Started

## What We Built (Phase 1)

```
vertex/
├── bot/                    # Trading bot
│   ├── src/
│   │   ├── config.ts       # Env config
│   │   ├── wallet.ts       # Keypair from private key
│   │   ├── jupiter.ts       # Quote + swap via Jupiter API
│   │   ├── index.ts        # Entry point
│   │   └── test-swap.ts    # Test a single swap
│   ├── package.json
│   └── .env.example
├── supabase/
│   └── schema.sql          # DB tables (trades, settings, payouts)
└── README.md
```

## Step 1: Install Bot Dependencies

```bash
cd vertex/bot
npm install
```

## Step 2: Create Your Trading Wallet

1. Create a **new** Solana wallet (Phantom, Solflare, or CLI)
2. Export the **private key** (base58 format)
3. Fund it with:
   - ~0.1 SOL (for gas)
   - USDC or SOL to trade (e.g. $100–500 to start)

## Step 3: Configure Environment

```bash
cd vertex/bot
cp .env.example .env
```

Edit `.env`:

```
SOLANA_PRIVATE_KEY=your_base58_private_key_here
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Optional:** Use [Helius](https://helius.dev) free tier for better RPC limits:
```
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api_key=YOUR_KEY
```

## Step 4: Run the Bot

```bash
cd vertex/bot
npm run dev
```

You should see:
- Wallet address
- Balance
- "Phase 1 complete"

## Step 5: Test a Swap (Quote Only)

```bash
npm run test-swap
```

This fetches a Jupiter quote (SOL → USDC) without executing. If you see quote data, the integration works.

**To execute a real swap:** Uncomment the `executeSwap` block in `bot/src/test-swap.ts`. Use a small amount first (0.001 SOL).

## Step 6: Supabase (Optional for Phase 1)

For trade logging (Phase 3), set up Supabase:

1. Create a free project at [supabase.com](https://supabase.com)
2. Run `vertex/supabase/schema.sql` in the SQL editor
3. Add to `.env`:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key
   ```

---

## Next: Phase 2

Once Phase 1 works, we'll add:
- Triangular arbitrage detection (USDC ↔ SOL ↔ USDT)
- Profit calculation
- Min profit threshold
- Execution loop

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "SOLANA_PRIVATE_KEY is required" | Add private key to `.env` |
| Quote fails | Check RPC URL; try Helius free tier |
| Swap fails | Ensure wallet has SOL for gas + tokens to swap |
| "npm not found" | Open a new terminal; ensure Node.js is installed |
