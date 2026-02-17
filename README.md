# Vertex

Multi-feature income platform. First product: Solana triangular arbitrage bot.

## Structure

```
vertex/
├── bot/          # Trading bot (Node.js + TypeScript)
├── dashboard/    # Next.js dashboard (Phase 5)
└── supabase/     # Database schema
```

## Quick Start

### 1. Bot Setup

```bash
cd vertex/bot
npm install
cp .env.example .env
# Edit .env with your wallet private key and RPC URL
npm run dev
```

### 2. Environment Variables

- `SOLANA_PRIVATE_KEY` - Base58 private key for trading wallet
- `SOLANA_RPC_URL` - RPC endpoint (Helius free tier or public)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key

## Deployment

- **Bot:** Oracle Cloud free VM or your machine
- **Dashboard:** Vercel free tier
- **Database:** Supabase free tier
