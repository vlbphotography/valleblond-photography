/* ============================================================
   Valleblond Photography — Utilitaires serveur Instagram

   Ces fonctions s'exécutent uniquement dans Netlify. Les jetons Meta et la
   clé service_role Supabase ne sont jamais envoyés au navigateur.
   ============================================================ */

const supabaseUrl = () => process.env.SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export function json(data, status = 200) {
    return Response.json(data, { status });
}

export function requireInstagramConfiguration() {
    const missing = ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
        .filter((name) => !process.env[name]);

    if (missing.length) {
        throw new Error(`Configuration Instagram incomplète : ${missing.join(", ")}`);
    }
}

export function graphUrl(path, parameters = {}) {
    // La version reste surchargable dans Netlify si Meta en publie une autre.
    // v24.0 reste stable pour l'intégration initiale et évite un réglage inutile.
    const version = process.env.INSTAGRAM_GRAPH_API_VERSION || "v24.0";
    const url = new URL(`https://graph.instagram.com/${version}/${path.replace(/^\//, "")}`);
    Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
    return url;
}

export async function supabaseRequest(path, options = {}) {
    const response = await fetch(`${supabaseUrl()}${path}`, {
        ...options,
        headers: {
            apikey: serviceKey(),
            Authorization: `Bearer ${serviceKey()}`,
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Supabase : ${error.message || error.msg || response.status}`);
    }

    if (response.status === 204) return null;
    return response.json().catch(() => null);
}

export async function requireStudioAdmin(request) {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) throw new Error("Session Studio requise.");

    const userResponse = await fetch(`${supabaseUrl()}/auth/v1/user`, {
        headers: { apikey: serviceKey(), Authorization: `Bearer ${token}` }
    });
    const user = await userResponse.json().catch(() => null);
    if (!userResponse.ok || !user?.id) throw new Error("Session Studio expirée.");

    const administrators = await supabaseRequest(`/rest/v1/studio_admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`);
    if (!administrators?.length) throw new Error("Accès Studio refusé.");

    return user;
}

export function publicArtworkUrl(storagePath) {
    return `${supabaseUrl()}/storage/v1/object/public/artworks/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function cleanCaption(value = "") {
    return String(value)
        .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function titleFromCaption(caption, timestamp, fallback = "Photographie Instagram") {
    const firstLine = cleanCaption(caption).split("\n").find(Boolean) || "";
    const normalized = firstLine.replace(/\s+/g, " ").trim();
    if (normalized) return normalized.slice(0, 140);

    const date = timestamp ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(timestamp)) : "";
    return date ? `${fallback} — ${date}` : fallback;
}

export function slugFromInstagramId(mediaId) {
    return `instagram-${String(mediaId).replace(/[^a-zA-Z0-9-]/g, "").toLowerCase()}`;
}

export function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[character]));
}
