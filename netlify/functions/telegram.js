/* ============================================================
   Valleblond Photography — Alertes Telegram

   Les alertes sont volontairement secondaires : une indisponibilité de
   Telegram ne doit jamais empêcher l'enregistrement d'une vente.
   Le jeton et l'identifiant de discussion restent uniquement dans Netlify.
   ============================================================ */

export async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.info("telegram-alert-skipped", "Configuration Telegram absente.");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true })
    });

    if (!response.ok) {
      console.error("telegram-alert-failed", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("telegram-alert-failed", error);
    return false;
  }
}

export function telegramSaleMessage({ type, amount, currency = "EUR", email, title }) {
  const details = [
    "💶 Nouvelle vente Valleblond",
    type,
    title ? `Œuvre : ${title}` : null,
    amount ? `Montant : ${amount} ${currency}` : null,
    email ? `Client : ${email}` : null,
    "→ Ouvrir le Studio : https://vlbphotography.netlify.app/pages/admin/"
  ].filter(Boolean);
  return details.join("\n");
}
