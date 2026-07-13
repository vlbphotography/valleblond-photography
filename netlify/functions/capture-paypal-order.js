export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { orderId } = await request.json();
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const token = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" }).then((r) => r.json());
  const order = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" } }).then((r) => r.json());
  if (order.status !== "COMPLETED") return Response.json({ error: "Paiement non confirmé" }, { status: 422 });
  const unit = order.purchase_units[0];
  const capture = unit.payments.captures[0];
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/digital_orders`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ artwork_id: unit.custom_id, paypal_order_id: order.id, paypal_capture_id: capture.id, buyer_email: order.payer?.email_address, amount: capture.amount.value, currency: capture.amount.currency_code, status: "completed", completed_at: new Date().toISOString() }) });
  return Response.json({ success: true });
};
