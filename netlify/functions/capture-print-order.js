const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

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

    const saveResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/print_orders`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        artwork_id: unit.custom_id,
        paypal_order_id: order.id,
        paypal_capture_id: capture.id,
        buyer_email: order.payer?.email_address,
        amount: capture.amount.value,
        currency: capture.amount.currency_code,
        shipping_address: unit.shipping || null,
        status: "completed",
        completed_at: new Date().toISOString()
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
