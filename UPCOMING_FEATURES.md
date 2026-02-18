# Upcoming Features – Implementation Checklist

Everything we discussed that needs to be built. Platform fee: **10%** to Vertex.

---

## 1. Capital Lock (90 days)

| Item | Details |
|------|---------|
| **What** | User deposits locked for 90 days |
| **Schema** | Add `lock_until` to deposits (or new `deposit_locks` table) |
| **Logic** | On deposit: `lock_until = now + 90 days` |
| **Withdrawal** | Capital only withdrawable after `lock_until` |

---

## 2. Profit Model (Never Trade Profits)

| Item | Details |
|------|---------|
| **What** | Credited profits go to reserve, never traded |
| **Reserve** | `reserve = sum(credited_profit - withdrawn_profit)` per user |
| **Tradable** | `tradable = pool_balance - total_reserve` |
| **Trading** | Bot only uses `tradable` for trade size |

---

## 3. Platform Fee (10%)

| Item | Details |
|------|---------|
| **What** | Vertex keeps 10% of pool profits |
| **Split** | 90% to users, 10% to platform |
| **When** | Applied when crediting profit from each trade (or daily batch) |
| **Destination** | Platform wallet (configurable) or stays in pool as platform share |

---

## 4. Daily Profit Crediting

| Item | Details |
|------|---------|
| **What** | Every 24 hours, credit each user their profit share |
| **Source** | Pool profit from trades in last 24h (or since last credit) |
| **Split** | 90% to users by share, 10% to platform |
| **Storage** | `user_profit_earned` (running total) or `profit_credits` table |
| **Job** | Cron/scheduled job (bot or Supabase Edge Function) |

---

## 5. Profit Withdrawable Anytime

| Item | Details |
|------|---------|
| **What** | After profit is credited, user can withdraw immediately |
| **No lock** | Profit has no lock period |
| **Reserve** | Credited profit sits in reserve until withdrawn |
| **UI** | "Withdraw profit" button, separate from "Withdraw capital" (after lock) |

---

## 6. Trade Size Scaling

| Item | Details |
|------|---------|
| **What** | Scale trade size with tradable pool |
| **Formula** | `trade_size = min(tradable × 0.01, max_per_trade)` (1% of tradable) |
| **Bounds** | Min 0.01 SOL, max 1 SOL (or configurable) |
| **Input** | Use `tradable` (pool - reserve), not full pool |

---

## 7. Schema Changes Needed

| Table/Column | Purpose |
|--------------|---------|
| `deposits.lock_until` | When capital can be withdrawn |
| `user_profit_earned` | Total profit credited to user |
| `user_withdrawn_profit` | Profit user has withdrawn |
| `user_withdrawn_capital` | Capital user has withdrawn (after lock) |
| `profit_credits` (optional) | Per-credit records (date, amount, user) |
| `platform_profit` or settings | Track platform's 10% share |
| `PLATFORM_WALLET` env | Where platform fee goes (optional) |

---

## 8. Referral System

| Item | Details |
|------|---------|
| **Unique codes** | Each user gets `referral_code` (e.g. `VERTEX-ABC123`) |
| **Signup** | `?ref=ABC123` in URL, store `referred_by` on signup |
| **Dashboard** | "Referrals" tab: list referrals, count, stats |
| **Optional** | Referral rewards (% of referred user's profits) |

---

## 9. Withdrawal Logic Updates

| Item | Details |
|------|---------|
| **Profit** | Can withdraw `user_profit_earned - user_withdrawn_profit` anytime |
| **Capital** | Can withdraw only after `lock_until`, up to deposits - withdrawn_capital |
| **Check** | Ensure reserve has enough before allowing profit withdrawal |

---

## 10. Implementation Order

1. Schema: lock_until, profit tracking columns
2. Platform fee: 10% on profit credit
3. Reserve/tradable: compute before trading
4. Trade size: scale with tradable
5. Daily profit crediting job
6. Withdrawal logic: profit vs capital
7. Referral system
8. Dashboard UI updates

---

## Summary

| Feature | Status |
|---------|--------|
| 90-day capital lock | To build |
| Profit never traded (reserve) | To build |
| 10% platform fee | To build |
| Daily profit crediting | To build |
| Profit withdrawable anytime | To build |
| Trade size scaling | To build |
| Referral system | To build |
