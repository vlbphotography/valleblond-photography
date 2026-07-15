import { json, requireStudioAdmin } from "./instagram-utils.js";
import { sendTelegramAlert } from "./telegram.js";

// Le test exige une session Studio valide : personne ne peut utiliser cette
// fonction publique pour transformer le bot en relais de messages.
export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    await requireStudioAdmin(request);
    const sent = await sendTelegramAlert(
      "🧪 Test Valleblond Monitor\n\nCe test ne crée aucune commande, aucun paiement et aucune donnée client.",
      {
        replyMarkup: {
          inline_keyboard: [[
            { text: "Tester le bot NAS", callback_data: "valleblond:test:ping" }
          ]]
        }
      }
    );
    if (!sent) return json({ error: "Telegram n’est pas encore configuré dans Netlify." }, 400);
    return json({ success: true });
  } catch (error) {
    console.error("telegram-test", error);
    return json({ error: error.message || "Test Telegram indisponible." }, 500);
  }
};
