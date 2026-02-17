# Vertex Bot – Hetzner Deployment (~$4/month)

Hetzner has simpler signup than Oracle. Get the bot running in the cloud in ~30 minutes.

---

## Part 1: Create Hetzner Account & Server

### 1. Sign up
1. Go to [hetzner.com/cloud](https://www.hetzner.com/cloud)
2. Click **Sign up** (or **Create account**)
3. Enter email, password, verify email
4. Add payment method (PayPal or credit card – you’ll be charged ~$4/month)

### 2. Create a server
1. In Cloud Console, click **Add Server**
2. **Location:** Falkenstein or Nuremberg (or Ashburn if you want US)
3. **Image:** Ubuntu 24.04
4. **Type:** Shared vCPU → **CX22** (2 vCPU, 4 GB RAM, ~€4.51/month)
   - Or **CX11** (1 vCPU, 2 GB) for ~€3.29/month – enough for the bot
5. **SSH key:** Click **Add SSH key**
   - On Windows PowerShell: `ssh-keygen -t ed25519 -f C:\Users\aaron\.ssh\hetzner_vertex` (press Enter for no passphrase)
   - Copy contents of `C:\Users\aaron\.ssh\hetzner_vertex.pub` and paste into Hetzner
6. **Name:** vertex-bot
7. Click **Create & Buy now**

### 3. Get your server IP
- After creation, copy the **IPv4** address (e.g. `95.217.x.x`)

---

## Part 2: Connect and Install

### 4. SSH in (PowerShell)
```powershell
ssh -i C:\Users\aaron\.ssh\hetzner_vertex root@YOUR_SERVER_IP
```
Type `yes` if asked about host key.

### 5. Install Node.js and PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
node -v
```

---

## Part 3: Deploy the Bot

### 6. Copy project from your PC
**From a new PowerShell window on your PC** (not in SSH):
```powershell
scp -i C:\Users\aaron\.ssh\hetzner_vertex -r C:\Users\aaron\vertex root@YOUR_SERVER_IP:~/
```

### 7. Set up on the server (back in SSH)
```bash
cd ~/vertex/bot
npm install
npm run build
mkdir -p logs
```

### 8. Create .env
```bash
nano .env
```
Paste (replace with your real values from `C:\Users\aaron\vertex\bot\.env`):
```
SOLANA_PRIVATE_KEY=your_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUPITER_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
```
Save: **Ctrl+O**, **Enter**, **Ctrl+X**

### 9. Start with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
Run the `sudo env PATH=...` command that `pm2 startup` prints.

### 10. Verify
```bash
pm2 status
pm2 logs vertex-arbitrage
```
You should see "Scanning for opportunities..."

---

## Useful Commands

| Command | Description |
|--------|-------------|
| `pm2 status` | Check if bot is running |
| `pm2 logs vertex-arbitrage` | View live logs |
| `pm2 restart vertex-arbitrage` | Restart the bot |

---

## No SSH key yet?

If you don't have an SSH key, create one first:
```powershell
ssh-keygen -t ed25519 -f C:\Users\aaron\.ssh\hetzner_vertex
```
Press Enter for no passphrase. Then add `C:\Users\aaron\.ssh\hetzner_vertex.pub` to Hetzner when creating the server.
