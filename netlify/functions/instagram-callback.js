import { escapeHtml, graphUrl, requireInstagramConfiguration, supabaseRequest } from "./instagram-utils.js";

function completionPage(success, message) {
    const safeMessage = escapeHtml(message);
    const payload = JSON.stringify({ type: "valleblond-instagram", success, message });
    return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instagram — Valleblond</title><style>body{background:#f8f7f4;color:#1c1c1c;font:16px system-ui,sans-serif;margin:0;display:grid;min-height:100vh;place-items:center;padding:24px}.box{background:#fff;max-width:420px;padding:40px;text-align:center}h1{font:400 38px Georgia,serif;margin:0 0 16px}p{line-height:1.6;margin:0}</style></head><body><main class="box"><h1>${success ? "Instagram connecté" : "Connexion impossible"}</h1><p>${safeMessage}</p></main><script>if(window.opener){window.opener.postMessage(${payload},window.location.origin);setTimeout(()=>window.close(),1800)}</script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export default async (request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const metaError = url.searchParams.get("error_message") || url.searchParams.get("error");

    try {
        requireInstagramConfiguration();
        if (metaError) throw new Error(`Autorisation annulée : ${metaError}`);
        if (!code || !state) throw new Error("Réponse Instagram incomplète.");

        const now = new Date().toISOString();
        const states = await supabaseRequest(`/rest/v1/instagram_oauth_states?state=eq.${encodeURIComponent(state)}&expires_at=gt.${encodeURIComponent(now)}&select=state,studio_user_id`);
        const oauthState = states?.[0];
        if (!oauthState) throw new Error("Cette autorisation a expiré. Relance la connexion depuis le Studio.");

        const redirectUri = `${url.origin}/.netlify/functions/instagram-callback`;
        const exchangeBody = new URLSearchParams({
            client_id: process.env.INSTAGRAM_APP_ID,
            client_secret: process.env.INSTAGRAM_APP_SECRET,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
            code
        });
        const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: exchangeBody
        });
        const shortLivedToken = await tokenResponse.json();
        if (!tokenResponse.ok || !shortLivedToken.access_token || !shortLivedToken.user_id) {
            throw new Error(shortLivedToken.error?.message || "Instagram n'a pas fourni de jeton d’accès.");
        }

        // Un jeton longue durée évite de demander une nouvelle autorisation à
        // chaque import. Son renouvellement sera ajouté avec la surveillance.
        const longLivedUrl = new URL("https://graph.instagram.com/access_token");
        longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
        longLivedUrl.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET);
        longLivedUrl.searchParams.set("access_token", shortLivedToken.access_token);
        const longLivedResponse = await fetch(longLivedUrl);
        const longLivedToken = await longLivedResponse.json();
        if (!longLivedResponse.ok || !longLivedToken.access_token) {
            throw new Error(longLivedToken.error?.message || "Instagram n'a pas prolongé l’autorisation.");
        }

        const profileResponse = await fetch(graphUrl(shortLivedToken.user_id, {
            fields: "user_id,username",
            access_token: longLivedToken.access_token
        }));
        const profile = await profileResponse.json();
        if (!profileResponse.ok || !profile.user_id) throw new Error(profile.error?.message || "Le compte Instagram professionnel n'a pas été reconnu.");

        const expiresAt = longLivedToken.expires_in
            ? new Date(Date.now() + Number(longLivedToken.expires_in) * 1000).toISOString()
            : null;

        await supabaseRequest("/rest/v1/instagram_connections?on_conflict=studio_user_id", {
            method: "POST",
            headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
            body: JSON.stringify({
                studio_user_id: oauthState.studio_user_id,
                instagram_account_id: String(profile.user_id),
                instagram_username: profile.username || null,
                facebook_page_id: null,
                facebook_page_name: null,
                page_access_token: longLivedToken.access_token,
                token_expires_at: expiresAt,
                updated_at: new Date().toISOString()
            })
        });
        await supabaseRequest(`/rest/v1/instagram_oauth_states?state=eq.${encodeURIComponent(state)}`, { method: "DELETE" });

        return completionPage(true, `Le compte @${profile.username || "Instagram"} est prêt à être synchronisé.`);
    } catch (error) {
        console.error("instagram-callback", error);
        return completionPage(false, error.message || "La connexion Instagram n'a pas abouti.");
    }
};
