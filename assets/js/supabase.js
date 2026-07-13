/* ============================================================
   Valleblond Photography
   Client Supabase partagé
   ============================================================ */

if (!window.supabase) {
    throw new Error("La bibliothèque Supabase n'a pas été chargée.");
}

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("La configuration Supabase est incomplète.");
}

const supabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
