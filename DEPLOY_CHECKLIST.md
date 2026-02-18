# Vertex – Full Deploy Guide (Step by Step)

Do these steps in order. Each step says where to run the command.

---

## How to Tell Where You Are

| Prompt | Where you are |
|--------|----------------|
| `aaron@LAPTOP-VPKCKB2C MINGW64 ~/vertex` | **Your PC** (Git Bash) |
| `root@vertex-bot:~#` | **The server** (Hetzner) |

---

## STEP 1: On your PC – Push code to GitHub

Open **Git Bash** on your PC. Run:

```bash
cd ~/vertex
git add .
git status
git commit -m "Deploy update"
git push origin main
```

Wait for it to finish. You stay on your PC.

---

## STEP 2: On your PC – Copy project to server

Still in Git Bash on your PC. Run:

```bash
scp -i /c/Users/aaron/.ssh/hetzner_vertex -r /c/Users/aaron/vertex root@46.225.165.253:~/
```

- Type `yes` if it asks about the host key
- This can take 2–5 minutes (copying many files)
- When it finishes, you get your prompt back

---

## STEP 3: On your PC – Connect to the server

Still in Git Bash on your PC. Run:

```bash
ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253
```

- Your prompt changes to `root@vertex-bot:~#`
- You are now on the server

---

## STEP 4: On the server – Go to bot folder

Your prompt is `root@vertex-bot:~#`. Run:

```bash
cd ~/vertex/bot
```

---

## STEP 5: On the server – Install and build

Still on the server. Run these one at a time:

```bash
npm install
```

Wait for it to finish. Then:

```bash
npm run build
```

Wait for it to finish.

---

## STEP 6: On the server – Restart the bot

Still on the server. Run:

```bash
pm2 delete vertex-arbitrage
```

(If it says "process not found", that's fine. Continue.)

Then:

```bash
pm2 start ecosystem.config.cjs
```

Then:

```bash
pm2 save
```

---

## STEP 7: On the server – Check logs

```bash
pm2 logs vertex-arbitrage --lines 30
```

Look for:
- `[config] SOLANA_RPC_URL:` – confirms .env is loading
- No `401 Unauthorized` errors
- `Scanning for opportunities...`
- `[deposit-watcher] Started`

Press **Ctrl+C** to stop viewing logs (bot keeps running).

---

## STEP 8: On the server – Disconnect (optional)

To leave the server and return to your PC:

```bash
exit
```

Your prompt returns to `aaron@LAPTOP-VPKCKB2C...` – you're back on your PC.

---

## If you see 401 errors – Fix .env on the server

**1. Connect to the server** (from your PC in Git Bash):

```bash
ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253
```

**2. Check what RPC URL is set:**

```bash
grep SOLANA_RPC_URL ~/vertex/bot/.env
```

You should see: `SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=xxxx` (hyphen in api-key)

**3. Edit the .env file:**

```bash
nano ~/vertex/bot/.env
```

- Use arrow keys to move
- Find the `SOLANA_RPC_URL` line
- Make sure it is exactly: `SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`
- **Important:** Use `api-key` (hyphen), NOT `api_key` (underscore)
- No quotes, no spaces around `=`

**4. Save and exit:**
- Press **Ctrl+O** (to save)
- Press **Enter** (confirm)
- Press **Ctrl+X** (to exit)

**5. Restart the bot:**

```bash
cd ~/vertex/bot
pm2 delete vertex-arbitrage
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs vertex-arbitrage --lines 20
```

---

## Quick reference – All commands in order

**On your PC (Git Bash):**
```bash
cd ~/vertex
git add .
git commit -m "Deploy update"
git push origin main
scp -i /c/Users/aaron/.ssh/hetzner_vertex -r /c/Users/aaron/vertex root@46.225.165.253:~/
ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253
```

**On the server (after SSH connects):**
```bash
cd ~/vertex/bot
npm install
npm run build
pm2 delete vertex-arbitrage
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs vertex-arbitrage --lines 30
```
