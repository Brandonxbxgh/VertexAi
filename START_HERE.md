# Vertex – Get Moving Right Now

Three paths. Pick one and go.

---

## Option A: Bot on Hetzner + Dashboard on Vercel (recommended)

**Bot runs 24/7 in the cloud. Dashboard accessible from anywhere.**

1. **Deploy bot:** Follow [DEPLOY_HETZNER.md](DEPLOY_HETZNER.md) (~30 min, ~$4/month)
2. **Deploy dashboard:** Follow [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) (~10 min, free)

---

## Option B: Run bot on your PC (free, today)

**Bot runs while your PC is on. Good for testing.**

1. Open PowerShell in `vertex/bot`
2. Run:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
   npm run build
   .\start-bot.bat
   ```
3. Keep the window open. Bot runs until you close it.
4. Deploy dashboard to Vercel ([DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)) so you can view from anywhere.

---

## Option C: Dashboard only (see what you have)

**If the bot is already running somewhere** (e.g. you got Oracle working):

1. Follow [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) to deploy the dashboard
2. Open the Vercel URL, log in, refresh to see activity

---

## Quick reference

| File | Purpose |
|------|---------|
| [DEPLOY_HETZNER.md](DEPLOY_HETZNER.md) | Bot on Hetzner cloud (~$4/mo) |
| [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) | Dashboard on Vercel (free) |
| [bot/start-bot.bat](bot/start-bot.bat) | Run bot locally (double-click) |
