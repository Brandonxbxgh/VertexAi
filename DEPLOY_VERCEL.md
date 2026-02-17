# Deploy Dashboard to Vercel

Get a public URL so you can open the dashboard from any device.

---

## Step 1: Push to GitHub

### 1a. Create a GitHub repo
1. Go to [github.com](https://github.com) and sign in
2. Click **+** → **New repository**
3. Name: `vertex`
4. **Don’t** add README, .gitignore, or license
5. Click **Create repository**

### 1b. Push from your PC (PowerShell)
```powershell
cd C:\Users\aaron\vertex
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vertex.git
git push -u origin main
```
Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with **GitHub**
2. Click **Add New** → **Project**
3. Import your `vertex` repository
4. **Configure:**
   - **Root Directory:** Click **Edit** → type `dashboard` → **Continue**
   - **Framework Preset:** Next.js (auto-detected)
5. **Environment Variables** – Add these (same as `dashboard/.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://maxkhncnekpfghvkedcn.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key from `.env.local`)
6. Click **Deploy**
7. Wait 1–2 minutes. You’ll get a URL like `vertex-xxx.vercel.app`

---

## Step 3: Use It

1. Open the Vercel URL
2. Log in (or sign up) with your Supabase Auth email
3. You’ll see Overview, Trades, Activity
4. Refresh anytime to see new bot activity

---

## Troubleshooting

- **Build fails:** Check that `dashboard` has `package.json` and `next.config.js`
- **Auth redirect errors:** Ensure Supabase Auth → URL Configuration has your Vercel URL in Redirect URLs
- **No data:** Bot must be running and logging to Supabase
