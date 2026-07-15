/* ============================================================
   Valleblond Photography
   Configuration publique du site

   Une clé "publishable" Supabase est conçue pour être présente
   dans le navigateur. Les droits réels sont définis par les
   politiques RLS dans Supabase, jamais dans ce fichier.
   ============================================================ */

const CONFIG = Object.freeze({
    SUPABASE_URL: "https://wanwxjzfxlxunynnmxia.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_G1P4cf8s5YflPO-NzU3oXA_dH4qx1d_",
    ARTWORKS_TABLE: "Artworks",
    UPLOADS_TABLE: "artwork_uploads",
    ARTWORKS_BUCKET: "artworks",
    PREVIEW_MAX_FILE_SIZE: 15 * 1024 * 1024,
    PREVIEW_ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
    // Identifiant public PayPal de production. Les opérations sensibles
    // utilisent exclusivement le secret conservé dans Netlify.
    PAYPAL_CLIENT_ID: "BAA3BPN-EBWUEt1bLtiKnSMoF-4KdMk7mzsu5H_gMEEhWgecT21wInqAYuUuDOsbYNw8Awp4krVSO6iLrg",
    PAYPAL_ENVIRONMENT: "live"
});
