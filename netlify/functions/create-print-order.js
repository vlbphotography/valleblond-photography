const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

function errorResponse(message, status = 500) {
  return Response.json({ error: message }, { status });
}

// Les fonctions de paiement nécessitent la clé JWT legacy service_role.
// Cette vérification évite de créer un paiement si Netlify a une mauvaise clé.
function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    if (payload.role !== "service_role") throw new Error("Rôle Supabase incorrect");
    return key;
  } catch (error) {
    throw new Error("La clé serveur Supabase de Netlify n’est pas une clé service_role valide.");
  }
}

async function getPayPalAccessToken() {
  const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) throw new Error("Connexion à PayPal impossible.");
  return data.access_token;
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { artworkId } = await request.json();
    if (!artworkId) return errorResponse("Œuvre introuvable.", 400);

    const serviceKey = getServiceRoleKey();
    const artworkResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/Artworks?id=eq.${encodeURIComponent(artworkId)}&is_published=eq.true&select=id,title,price_physical`,
      { headers: { apikey: serviceKey } }
    );
    const artworks = await artworkResponse.json();
    const artwork = artworks[0];
    const amount = Number(artwork?.price_physical);

    if (!artworkResponse.ok) return errorResponse("Catalogue indisponible.");
    if (!Number.isFinite(amount) || amount <= 0) return errorResponse("Cette œuvre n’est pas disponible en tirage.", 404);

    const accessToken = await getPayPalAccessToken();
    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        // PayPal présente et renvoie l'adresse choisie par l'acheteur.
        payment_source: {
          paypal: {
            experience_context: {
              shipping_preference: "GET_FROM_FILE",
              user_action: "PAY_NOW"
            }
          }
        },
        purchase_units: [{
          custom_id: artwork.id,
          description: `Tirage — ${artwork.title}`,
          amount: { currency_code: "EUR", value: amount.toFixed(2) }
        }]
      })
    });
    const order = await orderResponse.json();

    if (!orderResponse.ok || !order.id) return errorResponse("La commande PayPal n’a pas pu être créée.");
    return Response.json({ id: order.id });
  } catch (error) {
    console.error("create-print-order", error);
    return errorResponse(error.message || "Paiement indisponible pour le moment.");
  }
};
