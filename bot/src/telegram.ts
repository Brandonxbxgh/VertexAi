/**
 * Telegram alerts - send message when trade executes.
 * Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env to enable.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function isTelegramEnabled(): boolean {
  return !!(BOT_TOKEN && CHAT_ID);
}

export async function sendTelegramAlert(message: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("Telegram alert failed:", err);
  }
}
