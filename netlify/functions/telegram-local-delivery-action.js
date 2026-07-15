import { json } from "./instagram-utils.js";

const ALLOWED_ACTIONS = {
  approve: { from: "requested", to: "approved", fields: { payment_method: "pay_on_delivery", approved_at: new Date().toISOString() } },
  reject: { from: "requested", to: "rejected", fields: {} },
  mark_paid_in_person: { from: "approved", to: "paid_in_person", fields: { payment_method: "pay_on_delivery", paid_at: new Date().toISOString() } },
  mark_delivered: { from: "paid_in_person", to: "delivered", fields: { delivered_at: new Date().toISOString() } }
};

function hasValidMonitorKey(request) {
  const expected = process.env.NAS_MONITOR_API_KEY;
  const received = request.headers.get("x-valleblond-monitor-key") || "";
  return Boolean(expected) && received.length === expected.length && received === expected;
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!hasValidMonitorKey(request)) return json({ error: "Accès NAS refusé." }, 401);

  try {
    const { requestId, action } = await request.json();
    const transition = ALLOWED_ACTIONS[action];
    if (!transition || typeof requestId !== "string") return json({ error: "Action locale invalide." }, 400);

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/local_delivery_requests?id=eq.${encodeURIComponent(requestId)}&status=eq.${transition.from}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({ status: transition.to, ...transition.fields })
    });
    const updated = await response.json().catch(() => []);
    if (!response.ok) throw new Error(`Supabase : ${response.status}`);
    if (!updated?.length) return json({ error: "Cette action n’est plus disponible pour cette demande." }, 409);

    return json({ success: true, status: transition.to, request: updated[0] });
  } catch (error) {
    console.error("telegram-local-delivery-action", error);
    return json({ error: error.message || "Action Telegram indisponible." }, 500);
  }
};
