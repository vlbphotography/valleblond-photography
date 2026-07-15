/* ============================================================
   Valleblond Photography — Lien Story Instagram

   Le Studio demande explicitement l'envoi : une simple modification
   d'œuvre ne doit jamais produire de notifications Telegram inutiles.
   ============================================================ */

import { json, requireStudioAdmin, supabaseRequest } from "./instagram-utils.js";
import { sendTelegramAlert } from "./telegram.js";

export default async (request) => {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    try {
        await requireStudioAdmin(request);

        const { artworkId } = await request.json().catch(() => ({}));
        if (!artworkId) return json({ error: "Œuvre introuvable." }, 400);

        const artworks = await supabaseRequest(
            `/rest/v1/Artworks?id=eq.${encodeURIComponent(artworkId)}&select=id,title,is_published`
        );
        const artwork = artworks?.[0];

        if (!artwork?.is_published) {
            return json({ error: "Publiez d’abord l’œuvre avant de partager son lien." }, 400);
        }

        const origin = new URL(request.url).origin;
        const artworkUrl = `${origin}/pages/oeuvre.html?id=${encodeURIComponent(artwork.id)}`;
        const sent = await sendTelegramAlert(
            [
                "📲 Lien Story Instagram prêt",
                `Œuvre : ${artwork.title || "Sans titre"}`,
                "",
                "Copie ce lien dans le sticker « Lien » de ta story :",
                artworkUrl
            ].join("\n"),
            {
                replyMarkup: {
                    inline_keyboard: [[
                        { text: "Ouvrir l’œuvre", url: artworkUrl }
                    ]]
                }
            }
        );

        if (!sent) return json({ error: "Telegram n’est pas encore configuré dans Netlify." }, 400);
        return json({ success: true, artworkUrl });
    } catch (error) {
        console.error("telegram-artwork-link", error);
        return json({ error: error.message || "Le lien Instagram est indisponible." }, 500);
    }
};
