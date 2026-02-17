# Vertex Dashboard

Back office for the Vertex arbitrage bot. Login, monitor live activity, view trades, and manage settings.

## Features

- **Auth** – Sign up / sign in with email & password
- **Overview** – Today's trades, P&L, last activity
- **Trades** – Full trade history with Solscan links
- **Activity** – Live bot events (real-time)
- **Settings** – Bot config reference

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `vertex/supabase/schema.sql` in the SQL editor
3. **Authentication** → Enable Email provider
4. **Database → Replication** – enable for `activity_log` and `trades`
5. Copy project URL and anon key from **Settings → API**

### 2. Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Bot (for live data)

Add to `vertex/bot/.env`:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

### 4. Run

```bash
cd vertex/dashboard
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) → sign up or sign in
