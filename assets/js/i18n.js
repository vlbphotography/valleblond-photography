/* ============================================================
   Valleblond Photography — Langues publiques

   Le français est la langue éditoriale d'origine. L'anglais et l'espagnol
   emploient leurs champs dédiés lorsqu'ils sont renseignés dans le Studio ;
   la version française reste sinon visible, sans traduction automatique.
   ============================================================ */

const VALLEBLOND_LANGUAGE_KEY = "valleblond-language";
const VALLEBLOND_LANGUAGES = ["fr", "en", "es"];

const VALLEBLOND_TRANSLATIONS = {
    fr: {
        gallery: "Galerie", about: "À propos", contact: "Contact",
        hero: "Photographies d'instants,<br>de paysages et d'émotions.",
        scroll: "SCROLL POUR DÉCOUVRIR ↓", collection: "COLLECTION",
        discoverArtwork: "DÉCOUVRIR L’ŒUVRE", discoverCollection: "DÉCOUVRIR LA COLLECTION",
        photographs: "photographies", previousPhoto: "Photo précédente", nextPhoto: "Photo suivante",
        returnGallery: "← Retour à la galerie", returnArtwork: "← Retour à l’œuvre",
        loading: "Chargement…", notFoundArtwork: "Cette œuvre est introuvable.",
        notFoundArtworkText: "Elle n'est peut-être plus disponible, ou le lien est incorrect.",
        print: "Tirage physique", digital: "Fichier numérique HD", fineArt: "Tirage fine art",
        digitalUsage: "JPEG haute résolution — usage personnel", orderPrint: "Commander le tirage",
        digitalConsent: "Je demande expressément que l’envoi du fichier commence immédiatement après le paiement et reconnais perdre mon droit de rétractation dès le début de cet envoi.",
        digitalConsentNote: "Le fichier est destiné à un usage personnel. L’envoi est réalisé par email après confirmation du paiement.",
        deliveryCalculated: "Frais de livraison calculés avant le paiement.",
        contactTitle: "Parlons de votre projet", contactText: "Pour une question, une demande de tirage ou une collaboration, écrivez-moi directement.",
        contactButton: "ME CONTACTER", createdBy: "Créé par Valleblond Photography",
        legal: "Mentions légales", terms: "CGV", privacy: "Confidentialité",
        behindLens: "Derrière l'objectif", aboutFirst: "Je m'appelle Valentin, photographe basé à Amiens. Ce que je cherche à travers l'objectif, ce sont les lumières qui ne durent qu'un instant : un lever de soleil sur les hortillonnages, une façade sous la pluie, une rue vide au petit matin.",
        aboutSecond: "Chaque tirage disponible dans la boutique est une de ces trouvailles, sélectionnée et imprimée avec soin pour que vous puissiez la garder chez vous.",
        yourName: "Votre nom", yourEmail: "Votre email", yourMessage: "Votre message", sendMessage: "Envoyer le message",
        contactIntro: "Une question, un projet ou une demande de tirage ? Écrivez-moi.", sending: "Envoi en cours…",
        contactSuccess: "Votre message a bien été envoyé. Je vous répondrai dès que possible.", contactFailure: "Votre message n’a pas pu être envoyé. Veuillez réessayer.",
        collectionNotFound: "Collection introuvable", collectionUnavailable: "Cette collection n’est pas disponible.", completeCollection: "La collection complète", digitalPack: "PACK NUMÉRIQUE"
    },
    en: {
        gallery: "Gallery", about: "About", contact: "Contact",
        hero: "Photographs of moments,<br>landscapes and emotions.",
        scroll: "SCROLL TO DISCOVER ↓", collection: "COLLECTION",
        discoverArtwork: "DISCOVER THE ARTWORK", discoverCollection: "DISCOVER THE COLLECTION",
        photographs: "photographs", previousPhoto: "Previous photo", nextPhoto: "Next photo",
        returnGallery: "← Back to gallery", returnArtwork: "← Back to artwork",
        loading: "Loading…", notFoundArtwork: "This artwork cannot be found.",
        notFoundArtworkText: "It may no longer be available, or the link may be incorrect.",
        print: "Fine art print", digital: "High-resolution digital file", fineArt: "Fine art print",
        digitalUsage: "High-resolution JPEG — personal use", orderPrint: "Order this print",
        digitalConsent: "I expressly request that delivery of the file begins immediately after payment and acknowledge that I lose my right of withdrawal once delivery has begun.",
        digitalConsentNote: "The file is for personal use. It is delivered by email once payment has been confirmed.",
        deliveryCalculated: "Shipping is calculated before payment.",
        contactTitle: "Let's talk about your project", contactText: "For a question, a print request or a collaboration, write to me directly.",
        contactButton: "GET IN TOUCH", createdBy: "Created by Valleblond Photography",
        legal: "Legal notice", terms: "Terms and conditions", privacy: "Privacy",
        behindLens: "Behind the lens", aboutFirst: "My name is Valentin, a photographer based in Amiens. Through the lens, I look for fleeting light: a sunrise over the hortillonnages, a façade in the rain, an empty street at first light.",
        aboutSecond: "Every print available in the shop is one of these discoveries, selected and printed with care so that you can keep it at home.",
        yourName: "Your name", yourEmail: "Your email", yourMessage: "Your message", sendMessage: "Send message",
        contactIntro: "A question, a project or a print request? Write to me.", sending: "Sending…",
        contactSuccess: "Your message has been sent. I will get back to you as soon as possible.", contactFailure: "Your message could not be sent. Please try again.",
        collectionNotFound: "Collection not found", collectionUnavailable: "This collection is not available.", completeCollection: "The complete collection", digitalPack: "DIGITAL PACK"
    },
    es: {
        gallery: "Galería", about: "Sobre mí", contact: "Contacto",
        hero: "Fotografías de instantes,<br>paisajes y emociones.",
        scroll: "DESLIZA PARA DESCUBRIR ↓", collection: "COLECCIÓN",
        discoverArtwork: "DESCUBRIR LA OBRA", discoverCollection: "DESCUBRIR LA COLECCIÓN",
        photographs: "fotografías", previousPhoto: "Foto anterior", nextPhoto: "Foto siguiente",
        returnGallery: "← Volver a la galería", returnArtwork: "← Volver a la obra",
        loading: "Cargando…", notFoundArtwork: "No se encuentra esta obra.",
        notFoundArtworkText: "Puede que ya no esté disponible o que el enlace sea incorrecto.",
        print: "Impresión fine art", digital: "Archivo digital en alta resolución", fineArt: "Impresión fine art",
        digitalUsage: "JPEG en alta resolución — uso personal", orderPrint: "Comprar la impresión",
        digitalConsent: "Solicito expresamente que el envío del archivo comience inmediatamente después del pago y reconozco que pierdo mi derecho de desistimiento desde el inicio de dicho envío.",
        digitalConsentNote: "El archivo es para uso personal. Se envía por correo electrónico tras la confirmación del pago.",
        deliveryCalculated: "Los gastos de envío se calculan antes del pago.",
        contactTitle: "Hablemos de tu proyecto", contactText: "Para una pregunta, una solicitud de impresión o una colaboración, escríbeme directamente.",
        contactButton: "CONTACTARME", createdBy: "Creado por Valleblond Photography",
        legal: "Aviso legal", terms: "Condiciones generales", privacy: "Privacidad",
        behindLens: "Detrás del objetivo", aboutFirst: "Me llamo Valentin y soy fotógrafo en Amiens. A través del objetivo busco luces fugaces: un amanecer sobre los hortillonnages, una fachada bajo la lluvia, una calle vacía al amanecer.",
        aboutSecond: "Cada impresión disponible en la tienda es uno de estos hallazgos, seleccionado e impreso con cuidado para que puedas conservarlo en casa.",
        yourName: "Tu nombre", yourEmail: "Tu correo electrónico", yourMessage: "Tu mensaje", sendMessage: "Enviar el mensaje",
        contactIntro: "¿Una pregunta, un proyecto o una solicitud de impresión? Escríbeme.", sending: "Enviando…",
        contactSuccess: "Tu mensaje se ha enviado correctamente. Te responderé lo antes posible.", contactFailure: "No se ha podido enviar tu mensaje. Inténtalo de nuevo.",
        collectionNotFound: "Colección no encontrada", collectionUnavailable: "Esta colección no está disponible.", completeCollection: "La colección completa", digitalPack: "PACK DIGITAL"
    }
};

function valleblondLanguage() {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    const saved = window.localStorage.getItem(VALLEBLOND_LANGUAGE_KEY);
    return VALLEBLOND_LANGUAGES.includes(fromUrl) ? fromUrl : VALLEBLOND_LANGUAGES.includes(saved) ? saved : "fr";
}

function t(key) {
    return VALLEBLOND_TRANSLATIONS[valleblondLanguage()]?.[key] || VALLEBLOND_TRANSLATIONS.fr[key] || key;
}

function localized(record, field) {
    const language = valleblondLanguage();
    return language === "fr" ? record?.[field] : record?.[`${field}_${language}`] || record?.[field] || "";
}

function languageUrl(language, url = window.location.href) {
    const target = new URL(url, window.location.origin);
    if (language === "fr") target.searchParams.delete("lang");
    else target.searchParams.set("lang", language);
    return target.pathname + (target.search || "") + target.hash;
}

function applyTranslations() {
    const language = valleblondLanguage();
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        element.innerHTML = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
        element.placeholder = t(element.dataset.i18nPlaceholder);
    });
}

function mountLanguageSelector(container) {
    if (!container || container.querySelector(".language-switcher")) return;
    const selector = document.createElement("div");
    selector.className = "language-switcher";
    selector.setAttribute("aria-label", "Language selector");
    selector.innerHTML = VALLEBLOND_LANGUAGES.map((language) => `<button type="button" data-language="${language}" aria-pressed="${language === valleblondLanguage()}">${language.toUpperCase()}</button>`).join(" ");
    selector.addEventListener("click", (event) => {
        const language = event.target.dataset.language;
        if (!VALLEBLOND_LANGUAGES.includes(language)) return;
        window.localStorage.setItem(VALLEBLOND_LANGUAGE_KEY, language);
        window.location.href = languageUrl(language);
    });
    container.append(selector);
}

document.addEventListener("DOMContentLoaded", () => {
    applyTranslations();
    document.querySelectorAll("[data-language-selector]").forEach(mountLanguageSelector);
});

window.ValleblondI18n = { t, localized, language: valleblondLanguage, languageUrl, applyTranslations, mountLanguageSelector };
