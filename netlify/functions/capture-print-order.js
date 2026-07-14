const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const shippingOptions = {
  france: { label: "Colissimo France", amount: 9 },
  europe: { label: "Colissimo Europe", amount: 17 },
  uk: { label: "Colissimo Royaume-Uni", amount: 23 },
  world: { label: "Colissimo international", amount: 39 }
};

function errorResponse(message, status = 500) {
  return Response.json({ error: message }, { status });
}

// Les fonctions de paiement nécessitent la clé JWT legacy service_role.
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
    const { orderId } = await request.json();
    if (!orderId) return errorResponse("Commande introuvable.", 400);
    const serviceKey = getServiceRoleKey();

    const accessToken = await getPayPalAccessToken();
    // PayPal ne renvoie pas toujours custom_id après la capture. On lit la
    // commande initiale avant le paiement pour relier la vente à son œuvre.
    const orderDetailsResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const orderDetails = await orderDetailsResponse.json();
    const customId = orderDetails.purchase_units?.[0]?.custom_id;
    let orderReference;
    try { orderReference = JSON.parse(Buffer.from(String(customId || ""), "base64url").toString()); } catch { orderReference = null; }
    const artworkId = orderReference?.a;
    const shippingZone = orderReference?.z;
    const shipping = shippingOptions[shippingZone];

    if (!orderDetailsResponse.ok || !artworkId || !shipping) {
      return errorResponse("Commande PayPal invalide.", 422);
    }

    const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
    });
    const order = await captureResponse.json();
    const unit = order.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];

    if (!captureResponse.ok || order.status !== "COMPLETED" || !capture) {
      return errorResponse("Paiement non confirmé.", 422);
    }

    const saveResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/record_print_order_with_shipping`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_artwork_id: artworkId,
        p_paypal_order_id: order.id,
        p_paypal_capture_id: capture.id,
        p_buyer_email: order.payer?.email_address || null,
        p_amount: capture.amount.value,
        p_currency: capture.amount.currency_code,
        p_shipping_address: { ...(unit.shipping || {}), pickup_point: orderReference?.p || null },
        p_shipping_zone: shipping.label,
        p_shipping_amount: shipping.amount,
        p_completed_at: new Date().toISOString()
      })
    });

    if (!saveResponse.ok) {
      console.error("capture-print-order", await saveResponse.text());
      return errorResponse("Paiement confirmé, mais commande non enregistrée. Contactez-nous.");
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("capture-print-order", error);
    return errorResponse("Paiement indisponible pour le moment.");
  }
};
