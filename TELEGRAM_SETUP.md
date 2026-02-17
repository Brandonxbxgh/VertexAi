# Telegram Alerts Setup

Get notified on your phone when the bot executes a trade.

---

## 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g. `Vertex Alerts`)
4. Choose a username (e.g. `vertex_alerts_bot`)
5. Copy the **token** BotFather gives you (looks like `123456789:ABCdefGHI...`)

---

## 2. Get Your Chat ID

1. Send a message to your new bot (any message)
2. Visit: `https://api.telegram.org/botYOUR_TOKEN/getUpdates`
   - Replace `YOUR_TOKEN` with the token from step 1
3. Find `"chat":{"id":123456789}` in the JSON – that number is your Chat ID

---

## 3. Add to .env

Add to your bot's `.env` (local and server):

```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
TELEGRAM_CHAT_ID=123456789
```

---

## 4. Restart the Bot

On the server:

```bash
pm2 restart vertex-arbitrage
```

---

Alerts are optional. If these vars are not set, the bot runs normally without Telegram.
