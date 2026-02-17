# Vertex Phase 1 – Step-by-Step Build Guide

Follow these steps in order. Check off each one before moving to the next.

---

## Step 1: Project setup ✓

- [x] Git repo initialized in `vertex/`
- [x] `.gitignore` created (keeps secrets and junk out of Git)

**Status:** Done. Your project is ready for version control.

---

## Step 2: Install dependencies

Open a terminal (Ctrl+` in Cursor) and run:

```powershell
cd c:\Users\aaron\vertex\bot
npm install
```

**What this does:** Installs the packages the bot needs (Solana SDK, Jupiter API helpers, etc.)

**Success looks like:** `added X packages` with no errors.

---

## Step 3: Create your trading wallet

You need a Solana wallet that the bot will use. **Use a new wallet** – don’t use your main one.

### Option A: Phantom (easiest)

1. Install [Phantom](https://phantom.app) browser extension
2. Create a new wallet (or add a new one)
3. Go to **Settings → Security & Privacy → Export Private Key**
4. Enter your password and copy the key (long string of letters/numbers)

### Option B: Solflare

1. Install [Solflare](https://solflare.com) extension
2. Create a new wallet
3. Export the private key from settings

### Fund the wallet

Send to this wallet:

- **~0.1 SOL** – for transaction fees
- **Some SOL or USDC** – for trading (e.g. 0.1 SOL or $20 USDC to start)

You can use an exchange (Coinbase, etc.) or another wallet to send SOL.

---

## Step 4: Configure the bot

1. In `vertex/bot/`, copy `.env.example` to `.env`:
   - Right-click `.env.example` → Copy
   - Paste in same folder → Rename to `.env`

2. Open `.env` in the editor and replace the placeholders:

   ```
   SOLANA_PRIVATE_KEY=paste_your_actual_private_key_here
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   JUPITER_API_KEY=your_jupiter_api_key_here
   ```

3. Get a free Jupiter API key at [station.jup.ag](https://station.jup.ag/) and paste it into `JUPITER_API_KEY`.

4. Save the file.

**Important:** Never share your private key or commit `.env` to Git. `.gitignore` already excludes it.

---

## Step 5: Run the bot

In the terminal:

```powershell
cd c:\Users\aaron\vertex\bot
npm run dev
```

**Success looks like:**

```
Vertex Bot - Starting...

Wallet: <your wallet address>
RPC: https://api.mainnet-beta.solana.com
Balance: X.XX SOL

Phase 1 complete. Wallet and connection ready.
```

If you see that, the bot is connected and ready.

---

## Step 6: Test a swap (quote only)

Still in `vertex/bot/`:

```powershell
npm run test-swap
```

**Success looks like:**

```
Vertex Bot - Test Swap

Getting quote: SOL -> USDC (0.001 SOL)...
Quote received:
  In: 1000000 lamports
  Out: XXXXX USDC (6 decimals)
  Price impact: X.XX%

Test complete. Quote works.
```

This only fetches a quote – no real swap happens.

---

## Step 7: Optional – Execute a real swap

If you want to do a real swap (uses real funds):

1. Open `vertex/bot/src/test-swap.ts`
2. Uncomment lines 37–44 (the `executeSwap` block)
3. Run `npm run test-swap` again

It swaps **0.001 SOL** (~$0.20) to USDC. Start small.

---

## You’re done with Phase 1

Once Step 6 works, Phase 1 is complete. Next up: Phase 2 (triangular arbitrage detection and execution).
