# Vertex – Full Deploy Guide (Step by Step)

---

## Normal deploy (no more SCP)

**On your PC:**
```bash
cd c:/Users/aaron/vertex
git add .
git commit -m "Deploy update"
git push origin main
```

**Connect to server:**
```bash
ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253
```

**On the server (one command):**
```bash
~/vertex/deploy.sh
```

That's it. No SCP. The script pulls from git, builds, and restarts PM2.

---

## First time only – if deploy.sh doesn't exist on server

If the server doesn't have the repo yet, copy once:

```bash
scp -i /c/Users/aaron/.ssh/hetzner_vertex -r /c/Users/aaron/vertex root@46.225.165.253:~/
```

Then SSH in and run:
```bash
chmod +x ~/vertex/deploy.sh
~/vertex/deploy.sh
```

---

## How to tell where you are

| Prompt | Where you are |
|--------|----------------|
| `aaron@LAPTOP...` or `PS C:\...` | **Your PC** |
| `root@vertex-bot:~#` | **The server** |

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

## Quick reference

**PC:** `git add . && git commit -m "Deploy" && git push`  
**SSH:** `ssh -i /c/Users/aaron/.ssh/hetzner_vertex root@46.225.165.253`  
**Server:** `~/vertex/deploy.sh`
