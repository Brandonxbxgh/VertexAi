# Vertex – 24/7 Runbook

Everything you need to know about what runs where, what it does, and how to keep it running.

---

## What You Have (Overview)

| Component | Where it runs | What it does | Runs 24/7? |
|-----------|---------------|--------------|------------|
| **Arbitrage bot** | Hetzner server | Trades三角套利 on Solana, earns profit | Yes (if PM2 set up) |
| **Deposit watcher** | Same process as bot | Monitors pool wallet, attributes incoming SOL to users | Yes (same process) |
| **Dashboard** | Vercel | Web UI: login, settings, wallet management, view trades | Yes (Vercel is always on) |
| **Database** | Supabase | Stores trades, deposits, users, activity | Yes (Supabase is always on) |

---

## Your Servers & Logins

| Service | URL / IP | Purpose |
|---------|----------|---------|
| **Hetzner** | `46.225.165.253` | Runs the bot + deposit watcher |
| **Vercel** | [vercel.com](https://vercel.com) | Hosts the dashboard |
| **Supabase** | [supabase.com](https://supabase.com) | Database |
| **GitHub** | [github.com](https://github.com) | Code (Vercel deploys from here) |

---

## What Each Part Does

### 1. Arbitrage bot (Hetzner)
- Scans Solana for triangular arbitrage opportunities
- Executes trades when profit is clear
- Logs trades and activity to Supabase
- Sends Telegram alerts (if configured)

### 2. Deposit watcher (same process)
- Polls the pool wallet every 60 seconds for incoming SOL
- Attributes deposits to users based on their `deposit_wallets`
- Inserts into `deposits` table
- Runs automatically when the bot starts

### 3. Dashboard (Vercel)
- Users log in, manage deposit/withdrawal wallets
- View trades, activity, P&L
- Settings page

### 4. Database (Supabase)
- `trades` – every swap
- `deposits` – user deposits (attributed)
- `user_profiles` – deposit_wallets, withdrawal_wallet
- `activity_log` – bot events

---

## How to Keep Everything Running 24/7

### One-time setup (if not done yet)

1. **Hetzner:** PM2 must be configured to start on reboot
   ```bash
   ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253
   pm2 startup
   ```
   Run the `sudo env PATH=...` command it prints.

   **Note:** Use `/c/Users/...` paths in Git Bash (not `C:\Users\...`).

2. **Vercel:** Dashboard auto-deploys from GitHub. No action needed once connected.

3. **Supabase:** Cloud-hosted. No action needed.

---

### When you push new code

**1. Push to GitHub** (from your PC):
```powershell
cd C:\Users\aaron\vertex
git add .
git commit -m "Your message"
git push origin main
```
→ Vercel auto-deploys the dashboard.

**2. Update Hetzner** (copy code + restart) – **use Git Bash**:
```bash
scp -i /c/Users/aaron/.ssh/hetzner_vertex -r /c/Users/aaron/vertex root@46.225.165.253:~/
ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253
```
```bash
cd ~/vertex/bot
npm install
npm run build
pm2 restart vertex-arbitrage
pm2 save
```

---

### Quick health check

**SSH to Hetzner:**
```bash
ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253
pm2 status
pm2 logs vertex-arbitrage --lines 20
```

You should see:
- `vertex-arbitrage` status: `online`
- Logs: "Scanning for opportunities..." and "[deposit-watcher] Started"

---

## Summary: What You Need to Do

| When | Action |
|------|--------|
| **Nothing** | Vercel, Supabase run 24/7 automatically |
| **After code changes** | Push to GitHub + update Hetzner (scp + pm2 restart) |
| **If bot stops** | SSH to Hetzner, run `pm2 restart vertex-arbitrage` |
| **Monthly** | Optional: `pm2 status` to confirm bot is online |

---

## Files You Might Need

| File | Purpose |
|------|---------|
| `DEPLOY_HETZNER.md` | Full Hetzner setup |
| `DEPLOY_VERCEL.md` | Dashboard deployment |
| `DEPOSITS_GAMEPLAN.md` | Deposit system design |
| `bot/.env` | Bot secrets (never push to GitHub) |
| `dashboard/.env.local` | Dashboard env (Vercel has its own) |
