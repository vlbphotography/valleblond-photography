// Enregistre une demande locale sans jamais créer de paiement. Cette fonction
// utilise la clé service_role uniquement côté Netlify : elle ne sera jamais
// exposée dans le navigateur du visiteur.
import { sendTelegramAlert } from "./telegram.js";

function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status });
}

function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    if (payload.role !== "service_role") throw new Error("Rôle Supabase incorrect");
    return key;
  } catch {
    throw new Error("La clé serveur Supabase de Netlify n’est pas une clé service_role valide.");
  }
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await request.json();
    const artworkId = cleanText(body.artworkId, 80);
    const buyerName = cleanText(body.buyerName, 120);
    const buyerEmail = cleanText(body.buyerEmail, 254).toLowerCase();
    const buyerPhone = cleanText(body.buyerPhone, 40);
    const addressLine = cleanText(body.addressLine, 180);
    const postalCode = cleanText(body.postalCode, 20);
    const city = cleanText(body.city, 100);
    const paymentPreference = body.paymentPreference === "paypal_after_approval"
      ? "paypal_after_approval"
      : "pay_on_delivery";

    if (!artworkId || !buyerName || !buyerEmail || !addressLine || !postalCode || !city) {
      return errorResponse("Tous les champs de livraison sont nécessaires.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return errorResponse("Indiquez une adresse email valide.");
    }

    const serviceKey = getServiceRoleKey();
    const artworkResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/Artworks?id=eq.${encodeURIComponent(artworkId)}&is_published=eq.true&price_physical=not.is.null&select=id,title,price_physical`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const artworks = await artworkResponse.json();

    if (!artworkResponse.ok || !artworks?.length) {
      return errorResponse("Cette œuvre n’est pas disponible en tirage.", 404);
    }

    const artwork = artworks[0];
    const amount = Number(artwork.price_physical);

    if (!Number.isFinite(amount) || amount < 0) {
      return errorResponse("Le prix de cette œuvre est invalide.", 422);
    }

    const insertRequest = (payload) => fetch(`${process.env.SUPABASE_URL}/rest/v1/local_delivery_requests`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });
    const baseRequest = {
        artwork_id: artworkId,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone || null,
        address_line: addressLine,
        postal_code: postalCode,
        city,
        payment_preference: paymentPreference
    };
    // Le prix et le titre sont figés à la demande : une modification
    // ultérieure de l’œuvre ne doit jamais réécrire l’historique comptable.
    let insertResponse = await insertRequest({
        ...baseRequest,
        artwork_title: artwork.title || "Œuvre sans titre",
        amount: amount.toFixed(2),
        currency: "EUR"
    });

    let createdRequest = await insertResponse.json().catch(() => []);
    // Une ancienne base peut ne pas encore contenir les colonnes comptables.
    // La demande client reste alors enregistrable, sans bloquer le parcours.
    const missingAccountingColumn = !insertResponse.ok
      && /artwork_title|amount|currency/i.test(createdRequest?.message || "")
      && /column|schema cache/i.test(createdRequest?.message || "");
    if (missingAccountingColumn) {
      insertResponse = await insertRequest(baseRequest);
      createdRequest = await insertResponse.json().catch(() => []);
    }
    const requestId = createdRequest?.[0]?.id;

    if (!insertResponse.ok || !requestId) {
      console.error("create-local-delivery-request", createdRequest);
      return errorResponse("Votre demande n’a pas pu être enregistrée. Réessayez dans quelques instants.", 500);
    }

    await sendTelegramAlert([
      "📍 Nouvelle demande de livraison locale",
      `Œuvre : ${artwork.title || "Œuvre sans titre"}`,
      `Client : ${buyerName}`,
      `Email : ${buyerEmail}`,
      `Ville : ${postalCode} ${city}`,
      "→ À valider dans le Studio : https://vlbphotography.netlify.app/pages/admin/"
    ].join("\n"), {
      replyMarkup: {
        inline_keyboard: [[
          { text: "✅ Valider la zone", callback_data: `local:${requestId}:approve` },
          { text: "❌ Refuser", callback_data: `local:${requestId}:reject` }
        ]]
      }
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("create-local-delivery-request", error);
    return errorResponse("Votre demande n’a pas pu être envoyée. Réessayez dans quelques instants.", 500);
  }
};
