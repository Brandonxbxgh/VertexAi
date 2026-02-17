# Vertex Bot – 24/7 Deployment Guide

Run the bot on Oracle Cloud (free) so it scans around the clock. View activity anytime from your dashboard.

---

## Part 1: Oracle Cloud Setup

### 1. Create account
1. Go to [oracle.com/cloud/free](https://www.oracle.com/cloud/free)
2. Click **Start for free**
3. Sign up (credit card required for verification, but free tier won't charge)

### 2. Create a VM instance
1. Log in to Oracle Cloud Console
2. **Menu** (☰) → **Compute** → **Instances**
3. Click **Create instance**
4. Settings:
   - **Name:** vertex-bot
   - **Placement:** Keep default
   - **Image:** Ubuntu 22.04
   - **Shape:** **Ampere** → **VM.Standard.A1.Flex** (free tier)
   - **OCPUs:** 1
   - **Memory:** 6 GB
   - **Boot volume:** 50 GB (default)
   - **Add SSH keys:** Generate a key pair, download the private key, save it
5. Click **Create**

### 3. Open port 22 (SSH)
1. Go to **Networking** → **Virtual Cloud Networks**
2. Click your VCN → **Security Lists** → **Default Security List**
3. **Add Ingress Rule:**
   - Source: 0.0.0.0/0
   - IP Protocol: TCP
   - Destination port: 22
4. Save

---

## Part 2: Connect and Install

### 4. Get your VM's public IP
- In **Compute** → **Instances**, copy the **Public IP** of your instance

### 5. SSH into the VM
```bash
ssh -i /path/to/your-key.key ubuntu@YOUR_PUBLIC_IP
```
(On Windows, use PuTTY or WSL. Convert the key if needed.)

### 6. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should show v20.x
```

### 7. Install PM2 (process manager)
```bash
sudo npm install -g pm2
```

---

## Part 3: Deploy the Bot

### 8. Copy your project to the VM

**Option A: Git (if your project is in a repo)**
```bash
git clone https://github.com/yourusername/vertex.git
cd vertex/bot
```

**Option B: SCP (copy from your computer)**
From your Windows machine (PowerShell):
```powershell
scp -i your-key.key -r C:\Users\aaron\vertex ubuntu@YOUR_PUBLIC_IP:~/
```

### 9. Set up the bot on the VM
```bash
cd ~/vertex/bot
npm install
npm run build
mkdir -p logs
```

### 10. Create .env file
```bash
nano .env
```
Paste your env vars (same as local):
```
SOLANA_PRIVATE_KEY=your_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUPITER_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
```
Save: Ctrl+O, Enter, Ctrl+X

### 11. Start with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
Follow the `pm2 startup` command it prints (copy/paste the sudo command it gives you).

### 12. Verify it's running
```bash
pm2 status
pm2 logs vertex-arbitrage
```
You should see "Scanning for opportunities..."

---

## Part 4: Dashboard (Access from anywhere)

Deploy the dashboard to Vercel so you can open it from any device:

1. Push your `vertex` project to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
3. Import your repo, select the `vertex` root
4. **Configure:**
   - **Root Directory:** `dashboard`
   - **Framework:** Next.js (auto-detected)
5. **Environment Variables:** Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy

You'll get a URL like `vertex-xxx.vercel.app`. Open it, log in, and you'll see your bot's activity from anywhere.

---

## Useful Commands

| Command | Description |
|--------|-------------|
| `pm2 status` | Check if bot is running |
| `pm2 logs vertex-arbitrage` | View live logs |
| `pm2 restart vertex-arbitrage` | Restart the bot |
| `pm2 stop vertex-arbitrage` | Stop the bot |

---

## Troubleshooting

- **Bot stops after reboot:** Run `pm2 startup` again and execute the command it outputs
- **Out of memory:** The free tier has 6GB; the bot uses ~200MB. Should be fine.
- **Can't SSH:** Check the security list allows port 22 from 0.0.0.0/0
