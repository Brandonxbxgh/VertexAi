# Multi-User Deposits & Payouts – Gameplan

Everything we discussed for the deposit/withdrawal system. Use this as the master todo list.

---

## Current State

- **Git:** Working tree clean, 2 commits on `main` (Initial + P&L/Telegram/BONK/JUP)
- **Schema:** Single-user. `settings.payout_wallet` is global. No `users`, no `deposits`.
- **Auth:** Supabase Auth exists (login/signup). `auth.users` has users but no profiles.

---

## Concepts (Recap)

| Concept | Purpose |
|---------|---------|
| **Deposit wallets** | Attribute incoming deposits to the right user (who gets credit) |
| **Withdrawal wallet** | Where payouts are sent (can differ from deposit wallets) |
| **Deposits → user_id** | Each deposit is permanently linked to a user; attribution never lost |

---

## Phase 1: Database Schema

### 1.1 User profiles

Extend users with wallet config. Options:

- **Option A:** New `user_profiles` table (recommended)
- **Option B:** Supabase `auth.users` raw_user_meta_data (less flexible)

```
user_profiles
├── id UUID PK
├── user_id UUID FK → auth.users (UNIQUE)
├── deposit_wallets TEXT[] DEFAULT '{}'   -- addresses that attribute deposits to this user
├── withdrawal_wallet TEXT                -- where payouts go
├── wallet_change_cooldown_until TIMESTAMPTZ  -- optional: lock after removal
├── created_at, updated_at
```

**Constraint:** Each wallet address can appear in only one user's `deposit_wallets`. Enforce in app + DB trigger or unique index on unnest.

### 1.2 Deposits table (immutable, append-only)

```
deposits
├── id UUID PK
├── user_id UUID NOT NULL FK → auth.users
├── amount DECIMAL(20, 9) NOT NULL       -- e.g. SOL amount
├── mint TEXT NOT NULL                   -- token mint (SOL, USDC, etc.)
├── source_wallet TEXT NOT NULL           -- address that sent the deposit
├── tx_signature TEXT NOT NULL UNIQUE    -- idempotency: never double-count
├── created_at TIMESTAMPTZ
```

- **UNIQUE(tx_signature)** → idempotent processing
- No UPDATE/DELETE. Append-only.

### 1.3 Payouts (per-user)

Current `payouts` has `destination_wallet` but no `user_id`. Add:

```
ALTER TABLE payouts ADD COLUMN user_id UUID REFERENCES auth.users;
```

### 1.4 Wallet change audit log (optional)

```
wallet_audit_log
├── id UUID PK
├── user_id UUID
├── action TEXT  -- 'add_deposit_wallet' | 'remove_deposit_wallet' | 'set_withdrawal_wallet'
├── wallet_address TEXT
├── created_at TIMESTAMPTZ
```

---

## Phase 2: Deposit Watcher

### 2.1 Service

- **Input:** Pool wallet address (the bot’s trading wallet or a dedicated deposit address)
- **Process:** Poll or subscribe to incoming transfers (Solana `getSignaturesForAddress` + parse)
- **Logic:**
  1. For each new transfer: `source_wallet` = sender
  2. Look up `user_profiles` where `source_wallet = ANY(deposit_wallets)`
  3. If found: `INSERT INTO deposits (user_id, amount, mint, source_wallet, tx_signature) ON CONFLICT (tx_signature) DO NOTHING`
  4. If not found: log as unattributed, do not credit anyone

### 2.2 Run mode

- Cron job (e.g. every 30s) or long-poll
- Or separate Node service that runs 24/7

---

## Phase 3: Share Calculation

### 3.1 Formula

```
user_share = SUM(deposits.amount WHERE user_id = X) / SUM(deposits.amount)
user_profit_share = total_pool_profit × user_share
```

### 3.2 When to compute

- On demand when user views dashboard
- When processing payout request
- Optionally: materialized view or cached table updated on new deposit

---

## Phase 4: Payout Logic

### 4.1 Flow

1. User requests payout (or auto-scheduled)
2. Compute `user_share` and `amount_owed` (capital + profit)
3. Send to `user_profiles.withdrawal_wallet`
4. `INSERT INTO payouts (user_id, amount_*, destination_wallet, tx_signature, status)`
5. Update user’s “withdrawn” balance so it’s not double-paid

### 4.2 Requirements

- User must have `withdrawal_wallet` set
- Balance must be positive

---

## Phase 5: Dashboard UI

### 5.1 Settings / Wallets page

- **Deposit wallets:** List, add, remove
- **Withdrawal wallet:** Single address, set/update
- **Validation:** One wallet per user (reject if already used by another user)

### 5.2 Wallet removal safeguards

- Confirmation: “Removing wallet X. Past deposits stay attributed. Future deposits from X will not be credited.”
- Optional: 24–48h cooldown before removal (use `wallet_change_cooldown_until`)

### 5.3 User balance / share view

- Total deposited
- Current share %
- Profit share
- Withdrawal history

---

## Phase 6: API / Backend

### 6.1 Endpoints (or Supabase RPC)

| Action | Endpoint / RPC | Notes |
|--------|----------------|-------|
| Add deposit wallet | `add_deposit_wallet(address)` | Check not used by another user |
| Remove deposit wallet | `remove_deposit_wallet(address)` | Optional cooldown |
| Set withdrawal wallet | `set_withdrawal_wallet(address)` | Overwrites |
| Get my balance/share | `get_my_balance()` | Read-only |
| Request payout | `request_payout()` | Triggers send to withdrawal_wallet |

### 6.2 RLS

- Users can only read/update their own `user_profiles`
- Users can only read their own `deposits` and `payouts`
- Deposit watcher uses service role (bypasses RLS)

---

## Phase 7: Safeguards (Never Lose Attribution)

| Rule | Implementation |
|------|----------------|
| One wallet → one user | Unique constraint / check before add |
| Immutable deposits | No UPDATE/DELETE on `deposits` |
| Idempotency | `UNIQUE(tx_signature)` on deposits |
| Unregistered wallet | Log, do not credit anyone |
| Atomic writes | Use DB transaction for deposit + any balance update |

---

## Phase 8: Changing Deposit Wallets (Lost Wallet)

- User can remove lost wallet from `deposit_wallets`
- Past deposits stay attributed (stored in `deposits` with `user_id`)
- Future deposits from that address = unattributed (correct)
- User adds new wallet for future deposits
- No loss of attribution; system remains automatic

---

## Todo Checklist (Ordered)

- [ ] **1. Schema:** Create `user_profiles` table
- [ ] **2. Schema:** Create `deposits` table with UNIQUE(tx_signature)
- [ ] **3. Schema:** Add `user_id` to `payouts`
- [ ] **4. Schema:** Enforce one-wallet-per-user (trigger or app logic)
- [ ] **5. Schema:** (Optional) `wallet_audit_log`
- [ ] **6. Watcher:** Implement deposit watcher service
- [ ] **7. Watcher:** Integrate with Supabase (insert deposits)
- [ ] **8. Share:** Implement share calculation (function or query)
- [ ] **9. Payout:** Implement per-user payout logic
- [ ] **10. API:** Add/remove deposit wallet, set withdrawal wallet
- [ ] **11. Dashboard:** Wallets management UI
- [ ] **12. Dashboard:** Balance/share display
- [ ] **13. RLS:** Policies for user_profiles, deposits, payouts
- [ ] **14. Docs:** Update README / deployment docs

---

## Git Push (When Ready)

```bash
cd c:\Users\aaron\vertex
git add .
git status
git commit -m "Add multi-user deposits schema and gameplan"
git push origin main
```

**Note:** Your working tree is currently clean. No code has been changed since we started this discussion. The schema and features above are not yet implemented.
