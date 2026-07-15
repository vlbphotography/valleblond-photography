import { sendTelegramAlert, telegramSaleMessage } from "./telegram.js";

const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const paypalEnvironment = process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox";

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const { orderId } = await request.json();
    if (!orderId) return Response.json({ error: "Commande introuvable." }, { status: 400 });
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const token = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" }).then((item) => item.json());
    const order = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" } }).then((item) => item.json());
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    if (order.status !== "COMPLETED" || !capture) return Response.json({ error: "Paiement non confirmé." }, { status: 422 });
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const save = await fetch(`${process.env.SUPABASE_URL}/rest/v1/collection_orders?paypal_order_id=eq.${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ paypal_capture_id: capture.id, buyer_email: order.payer?.email_address, amount: capture.amount.value, currency: capture.amount.currency_code, paypal_environment: paypalEnvironment, status: "completed", completed_at: new Date().toISOString() }) });
    if (!save.ok) return Response.json({ error: "Paiement confirmé, mais commande non enregistrée." }, { status: 500 });
    await sendTelegramAlert(telegramSaleMessage({ type: "Pack numérique", amount: capture.amount.value, currency: capture.amount.currency_code, email: order.payer?.email_address }));
    return Response.json({ success: true });
  } catch (error) { console.error("capture-collection-order", error); await sendTelegramAlert(`⚠️ Erreur de commande pack\n${error.message || "Erreur inconnue"}`); return Response.json({ error: "Paiement indisponible pour le moment." }, { status: 500 }); }
};
