/**
 * Test Telegram alerts - run: npm run test-telegram
 * No trade executed, just sends a test message.
 */

import "dotenv/config";
import { sendTelegramAlert, isTelegramEnabled } from "./telegram";

async function main() {
  if (!isTelegramEnabled()) {
    console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env");
    process.exit(1);
  }

  await sendTelegramAlert(
    "🧪 <b>Vertex Test</b>\n\nTelegram alerts are working! The bot will notify you when trades execute."
  );
  console.log("Test message sent. Check your Telegram.");
}

main().catch(console.error);
