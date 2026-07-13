async function startDigitalCheckout(artworkId, container) {
  if (!CONFIG.PAYPAL_CLIENT_ID) return;
  const sdk = document.createElement("script");
  sdk.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.PAYPAL_CLIENT_ID}&currency=EUR`;
  sdk.onload = () => window.paypal.Buttons({
    createOrder: async () => (await fetch("/.netlify/functions/create-paypal-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artworkId }) }).then((r) => r.json())).id,
    onApprove: async (data) => { await fetch("/.netlify/functions/capture-paypal-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: data.orderID }) }); container.textContent = "Paiement confirmé. Vous recevrez votre fichier par email."; }
  }).render(container);
  document.head.append(sdk);
}
