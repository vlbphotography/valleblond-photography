const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const paypalEnvironment = process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox";

function errorResponse(message, status = 500) { return Response.json({ error: message }, { status }); }
function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try { if (JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role !== "service_role") throw new Error(); return key; }
  catch { throw new Error("La clé serveur Supabase n’est pas valide."); }
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const { collectionId, immediateDeliveryConsent } = await request.json();
    if (!collectionId || immediateDeliveryConsent !== true) return errorResponse("La fourniture immédiate du pack doit être confirmée.", 400);
    const key = serviceKey();
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/collections?id=eq.${encodeURIComponent(collectionId)}&is_published=eq.true&select=id,title,price_digital_pack`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const collections = await response.json();
    const collection = collections?.[0];
    const amount = Number(collection?.price_digital_pack);
    if (!response.ok || !Number.isFinite(amount) || amount <= 0) return errorResponse("Ce pack numérique n’est pas disponible.", 404);
    const token = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" }).then((item) => item.json());
    const order = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ custom_id: collection.id, description: `Pack numérique — ${collection.title}`, amount: { currency_code: "EUR", value: amount.toFixed(2) } }] }) }).then((item) => item.json());
    if (!order.id) return errorResponse("La commande PayPal n’a pas pu être créée.");
    const save = await fetch(`${process.env.SUPABASE_URL}/rest/v1/collection_orders`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ collection_id: collection.id, paypal_order_id: order.id, amount: amount.toFixed(2), currency: "EUR", paypal_environment: paypalEnvironment, immediate_delivery_consent: true, consent_recorded_at: new Date().toISOString() }) });
    if (!save.ok) return errorResponse("La commande n’a pas pu être enregistrée.");
    return Response.json({ id: order.id });
  } catch (error) { console.error("create-collection-order", error); return errorResponse("Paiement indisponible pour le moment."); }
};
