async function startDigitalCheckout(artworkId, container) {
  if (!CONFIG.PAYPAL_CLIENT_ID) return;
  const sdk = document.createElement("script");
  sdk.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.PAYPAL_CLIENT_ID}&currency=EUR`;
  sdk.onload = () => window.paypal.Buttons({
    createOrder: async () => { const r = await fetch("/.netlify/functions/create-paypal-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artworkId }) }); const data = await r.json(); if (!r.ok || !data.id) throw new Error(data.error || "Commande indisponible"); return data.id; },
    onApprove: async (data) => { const r = await fetch("/.netlify/functions/capture-paypal-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: data.orderID }) }); if (!r.ok) throw new Error("Capture impossible"); container.textContent = "Paiement confirmé. Vous recevrez votre fichier par email."; },
    onError: (error) => { console.error(error); container.textContent = `Paiement indisponible : ${error.message}`; }
  }).render(container);
  document.head.append(sdk);
}
