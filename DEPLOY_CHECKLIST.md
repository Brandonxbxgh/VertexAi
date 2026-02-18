# Vertex – Deploy Checklist (Do Every Time)

Use this exact order. Do not skip steps.

---

## 1. On your PC (Git Bash)

```bash
cd ~/vertex
git add .
git status
git commit -m "Your message"
git push origin main
```

---

## 2. Copy code to Hetzner

```bash
scp -i /c/Users/aaron/.ssh/hetzner_vertex -r /c/Users/aaron/vertex root@46.225.165.253:~/
```

---

## 3. SSH to Hetzner

```bash
ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253
```

---

## 4. On the server – build and restart

```bash
cd ~/vertex/bot
npm install
npm run build
pm2 restart vertex-arbitrage
pm2 save
```

---

## 5. Fix the 401 "missing api key" error

The 401 means the Solana RPC URL on the server is wrong or not loading.

**On the server, verify what's in .env:**
```bash
grep SOLANA_RPC_URL ~/vertex/bot/.env
```
You should see: `SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api_key=xxxx`

**If it's wrong or empty, edit on the server:**
```bash
nano ~/vertex/bot/.env
```

Set exactly (no quotes, no spaces around =):
```
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api_key=YOUR_ACTUAL_KEY
```

**Or try public RPC (no key) to test:**
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Save:** Ctrl+O, Enter, Ctrl+X

**Full restart (required after .env or ecosystem changes):**
```bash
cd ~/vertex/bot
npm run build
pm2 delete vertex-arbitrage
pm2 start ecosystem.config.cjs
pm2 save
```

**Check logs – you should see `[config] SOLANA_RPC_URL:` with your URL:**
```bash
pm2 logs vertex-arbitrage --lines 20
```

---

## 6. Verify

```bash
pm2 logs vertex-arbitrage --lines 30
```

You should see:
- No 401 errors
- "Scanning for opportunities..."
- "[deposit-watcher] Started"
