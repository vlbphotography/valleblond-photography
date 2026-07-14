export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { artworkId, immediateDeliveryConsent } = await request.json();
  if (immediateDeliveryConsent !== true) {
    return Response.json({ error: "La demande d’envoi immédiat doit être confirmée." }, { status: 400 });
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const artworkResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/Artworks?id=eq.${encodeURIComponent(artworkId)}&is_published=eq.true&select=id,title,price_digital`, { headers: { apikey: key } });
  const artwork = await artworkResponse.json();
  if (!artworkResponse.ok) return Response.json({ error: `Supabase : ${artwork.message || artworkResponse.status}` }, { status: 500 });
  if (!artwork[0]?.price_digital) return Response.json({ error: "Cette œuvre n’est pas disponible à la vente numérique." }, { status: 404 });
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const token = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" }).then((r) => r.json());
  const order = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ custom_id: artwork[0].id, description: artwork[0].title, amount: { currency_code: "EUR", value: Number(artwork[0].price_digital).toFixed(2) } }] }) }).then((r) => r.json());
  if (!order.id) return Response.json({ error: "La commande PayPal n’a pas pu être créée." }, { status: 500 });

  // Conserve la preuve de l'accord avant le paiement et avant tout envoi du fichier.
  const saveOrder = await fetch(`${process.env.SUPABASE_URL}/rest/v1/digital_orders`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      artwork_id: artwork[0].id,
      paypal_order_id: order.id,
      amount: Number(artwork[0].price_digital).toFixed(2),
      currency: "EUR",
      immediate_delivery_consent: true,
      consent_recorded_at: new Date().toISOString()
    })
  });
  if (!saveOrder.ok) {
    const error = await saveOrder.json().catch(() => ({}));
    return Response.json({ error: `Commande indisponible : ${error.message || saveOrder.status}` }, { status: 500 });
  }

  return Response.json({ id: order.id }, { status: order.id ? 200 : 500 });
};
