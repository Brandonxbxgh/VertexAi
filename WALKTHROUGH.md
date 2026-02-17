# Vertex 24/7 – Step-by-Step Walkthrough

Follow these steps in order. Each section builds on the previous one.

---

## Step 1: Create Oracle Cloud Account

1. Open a browser and go to **https://www.oracle.com/cloud/free**
2. Click **Start for free**
3. Fill in your details (email, country, etc.)
4. Add a credit card for verification – **you will not be charged** on the free tier
5. Verify your email and complete signup
6. Log in to the Oracle Cloud Console

---

## Step 2: Create a VM Instance

1. In the Oracle Cloud Console, click the **☰ menu** (top left)
2. Go to **Compute** → **Instances**
3. Click **Create instance**

4. Fill in these settings:

   | Field | Value |
   |-------|-------|
   | Name | `vertex-bot` |
   | Image | **Ubuntu 22.04** |
   | Shape | Click **Change shape** → **Ampere** → **VM.Standard.A1.Flex** |
   | OCPUs | **1** |
   | Memory | **6 GB** |
   | Boot volume | 50 GB (default) |

5. Under **Add SSH keys**, choose **Generate a key pair for me**
6. Click **Save private key** – save it somewhere safe (e.g. `C:\Users\aaron\.ssh\oracle-vertex.key`)
7. Click **Save public key** (optional, it’s stored for you)
8. Click **Create**

9. Wait 1–2 minutes for the instance to show **Running**
10. Copy the **Public IP address** (you’ll need it for SSH)

---

## Step 3: Allow SSH Access

1. In the menu, go to **Networking** → **Virtual Cloud Networks**
2. Click your VCN (e.g. `vertex-bot-vcn`)
3. Click **Security Lists** → **Default Security List**
4. Click **Add Ingress Rules**
5. Set:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Destination port range:** `22`
6. Click **Add Ingress Rules**

---

## Step 4: Connect via SSH (Windows)

**Option A: Windows PowerShell (OpenSSH)**

1. Open PowerShell
2. Run:
   ```powershell
   ssh -i "C:\Users\aaron\.ssh\oracle-vertex.key" ubuntu@YOUR_PUBLIC_IP
   ```
   Replace `YOUR_PUBLIC_IP` with the IP from Step 2.

3. Type `yes` if asked about the host key
4. You should see a prompt like `ubuntu@vertex-bot:~$`

**Option B: PuTTY (if OpenSSH doesn’t work)**

1. Download PuTTY and PuTTYgen from https://www.putty.org/
2. In PuTTYgen: **Load** your `.key` file → **Save private key** as `.ppk`
3. In PuTTY: Host = `ubuntu@YOUR_PUBLIC_IP`, Connection → SSH → Auth → load your `.ppk`
4. Click **Open**

---

## Step 5: Install Node.js on the VM

Run these commands one at a time in your SSH session:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

```bash
sudo apt-get install -y nodejs
```

```bash
node -v
```

You should see something like `v20.x.x`.

---

## Step 6: Install PM2

```bash
sudo npm install -g pm2
```

```bash
pm2 -v
```

You should see a version number.

---

## Step 7: Copy Your Project to the VM

**Option A: SCP from your Windows machine**

1. Open a **new** PowerShell window (not the SSH session)
2. Run (replace paths and IP as needed):

   ```powershell
   scp -i "C:\Users\aaron\.ssh\oracle-vertex.key" -r C:\Users\aaron\vertex ubuntu@YOUR_PUBLIC_IP:~/
   ```

3. Wait for the copy to finish

**Option B: Git (if vertex is in a GitHub repo)**

1. In your SSH session:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vertex.git
   ```

---

## Step 8: Set Up the Bot on the VM

Back in your SSH session:

```bash
cd ~/vertex/bot
```

```bash
npm install
```

```bash
npm run build
```

```bash
mkdir -p logs
```

---

## Step 9: Create the .env File on the VM

```bash
nano .env
```

Paste your environment variables (same values as your local `bot/.env`):

```
SOLANA_PRIVATE_KEY=your_private_key_here
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUPITER_API_KEY=your_jupiter_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

- Replace each value with your real keys from `C:\Users\aaron\vertex\bot\.env`
- Save: **Ctrl+O**, **Enter**, **Ctrl+X**

---

## Step 10: Start the Bot with PM2

```bash
pm2 start ecosystem.config.cjs
```

```bash
pm2 save
```

```bash
pm2 startup
```

PM2 will print a command like:

```
sudo env PATH=... pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Copy and run that entire line so the bot starts automatically after a reboot.

---

## Step 11: Verify the Bot Is Running

```bash
pm2 status
```

You should see `vertex-arbitrage` with status **online**.

```bash
pm2 logs vertex-arbitrage
```

You should see "Scanning for opportunities...". Press **Ctrl+C** to exit logs.

---

## Step 12: Deploy the Dashboard to Vercel

1. Create a GitHub account if you don’t have one
2. Create a new repo (e.g. `vertex`)
3. On your Windows machine, in PowerShell:

   ```powershell
   cd C:\Users\aaron\vertex
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/vertex.git
   git push -u origin main
   ```

4. Go to **https://vercel.com** and sign in with GitHub
5. Click **Add New** → **Project**
6. Import your `vertex` repo
7. Configure:
   - **Root Directory:** Click **Edit** → set to `dashboard`
   - **Framework Preset:** Next.js (auto-detected)
8. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   (Same values as in `C:\Users\aaron\vertex\dashboard\.env.local`)
9. Click **Deploy**
10. Wait for the build to finish – you’ll get a URL like `vertex-xxx.vercel.app`

---

## Step 13: Use the Dashboard

1. Open the Vercel URL in your browser
2. Log in (or sign up) with the same email you use for Supabase Auth
3. You’ll see the Overview, Trades, and Activity pages
4. Refresh anytime to see new activity from the bot

---

## Quick Reference

| What | Command |
|------|---------|
| Check if bot is running | `pm2 status` |
| View live logs | `pm2 logs vertex-arbitrage` |
| Restart bot | `pm2 restart vertex-arbitrage` |
| Stop bot | `pm2 stop vertex-arbitrage` |

---

## Troubleshooting

- **"Permission denied" on SSH:** Check the key path and that you’re using `ubuntu@IP`
- **Bot stops after VM reboot:** Run `pm2 startup` again and execute the command it prints
- **Can’t reach dashboard:** Ensure Supabase env vars are set in Vercel
- **No trades showing:** Bot may not have found opportunities yet; check `pm2 logs` for activity
