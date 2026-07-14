// Doit rester synchronisé avec create-paypal-order.js : une commande créée
// dans un environnement PayPal ne peut être capturée que dans celui-ci.
const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { orderId } = await request.json();
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const token = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" }).then((r) => r.json());
  const order = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" } }).then((r) => r.json());
  if (order.status !== "COMPLETED") return Response.json({ error: "Paiement non confirmé" }, { status: 422 });
  const unit = order.purchase_units[0];
  const capture = unit.payments.captures[0];
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const saveOrder = await fetch(`${process.env.SUPABASE_URL}/rest/v1/digital_orders?paypal_order_id=eq.${encodeURIComponent(order.id)}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      paypal_capture_id: capture.id,
      buyer_email: order.payer?.email_address,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
      status: "completed",
      completed_at: new Date().toISOString()
    })
  });
  if (!saveOrder.ok) {
    const error = await saveOrder.json().catch(() => ({}));
    return Response.json({ error: `Paiement confirmé, mais commande non enregistrée : ${error.message || saveOrder.status}` }, { status: 500 });
  }

  return Response.json({ success: true });
};
