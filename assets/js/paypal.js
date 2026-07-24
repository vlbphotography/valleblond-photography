// Charge une seule fois le SDK PayPal, même lorsqu'une œuvre propose deux achats.
let paypalSdkPromise;

function loadPayPalSdk() {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (paypalSdkPromise) return paypalSdkPromise;

  paypalSdkPromise = new Promise((resolve, reject) => {
    const sdk = document.createElement("script");
    sdk.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.PAYPAL_CLIENT_ID}&currency=EUR`;
    sdk.onload = () => resolve(window.paypal);
    sdk.onerror = () => reject(new Error("Le service de paiement est indisponible."));
    document.head.append(sdk);
  });

  return paypalSdkPromise;
}

async function requestCheckout(endpoint, body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error || "Commande indisponible");
  return data;
}

async function startCheckout({
  artworkId,
  container,
  createEndpoint,
  captureEndpoint,
  successMessage,
  canCheckout = () => true,
  createRequestBody = () => ({ artworkId })
}) {
  if (!CONFIG.PAYPAL_CLIENT_ID) {
    container.textContent = "Paiement indisponible pour le moment.";
    return;
  }

  try {
    const paypal = await loadPayPalSdk();

    await paypal.Buttons({
      createOrder: async () => {
        if (!canCheckout()) {
          throw new Error("Veuillez confirmer la fourniture immédiate du fichier numérique.");
        }

        const data = await requestCheckout(createEndpoint, createRequestBody());
        if (!data.id) throw new Error("La commande n’a pas pu être créée.");
        return data.id;
      },
      onApprove: async (data) => {
        await requestCheckout(captureEndpoint, { orderId: data.orderID });
        container.textContent = successMessage;
      },
      onError: (error) => {
        console.error(error);
        container.textContent = `Paiement indisponible : ${error.message || "une erreur est survenue."}`;
      }
    }).render(container);
  } catch (error) {
    console.error(error);
    container.textContent = `Paiement indisponible : ${error.message || "une erreur est survenue."}`;
  }
}

function startDigitalCheckout(artworkId, container, canCheckout) {
  return startCheckout({
    artworkId,
    container,
    createEndpoint: "/.netlify/functions/create-paypal-order",
    captureEndpoint: "/.netlify/functions/capture-paypal-order",
    successMessage: "Paiement confirmé. Votre demande d’envoi immédiat est enregistrée. Vous recevrez votre fichier par email.",
    canCheckout,
    createRequestBody: () => ({
      artworkId,
      immediateDeliveryConsent: true
    })
  });
}

function startPrintCheckout(artworkId, shippingZone, container) {
  return startCheckout({
    artworkId,
    container,
    createEndpoint: "/.netlify/functions/create-print-order",
    captureEndpoint: "/.netlify/functions/capture-print-order",
    successMessage: "Commande confirmée. Vous recevrez le suivi de votre expédition par email.",
    createRequestBody: () => ({
      artworkId,
      shippingZone
    })
  });
}

// Les packs numériques sont des commandes distinctes : ils regroupent
// plusieurs œuvres, mais le fichier HD reste livré manuellement par email.
function startCollectionDigitalCheckout(collectionId, container, canCheckout) {
  return startCheckout({
    container,
    createEndpoint: "/.netlify/functions/create-collection-order",
    captureEndpoint: "/.netlify/functions/capture-collection-order",
    successMessage: "Paiement confirmé. Le pack vous sera envoyé par email.",
    canCheckout,
    createRequestBody: () => ({ collectionId, immediateDeliveryConsent: true })
  });
}
