import { escapeHtml, facebookAppId, facebookAppSecret, facebookGraphUrl, requireInstagramConfiguration, supabaseRequest } from "./instagram-utils.js";

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
        const tokenResponse = await fetch(facebookGraphUrl("oauth/access_token", {
            client_id: facebookAppId(),
            client_secret: facebookAppSecret(),
            redirect_uri: redirectUri,
            code
        }));
        const userToken = await tokenResponse.json();
        if (!tokenResponse.ok || !userToken.access_token) {
            throw new Error(userToken.error?.message || "Facebook n'a pas fourni de jeton d’accès.");
        }

        // Une seule Page liée à Instagram est attendue ici. Cette sélection
        // explicite empêche d'importer une autre Page administrée par Valentin.
        const pagesResponse = await fetch(facebookGraphUrl("me/accounts", {
            fields: "id,name,access_token,instagram_business_account{id,username}",
            access_token: userToken.access_token
        }));
        const pagesPayload = await pagesResponse.json();
        if (!pagesResponse.ok) throw new Error(pagesPayload.error?.message || "Facebook n'a pas retourné les Pages administrées.");

        const page = (pagesPayload.data || []).find((candidate) => candidate.instagram_business_account?.id && candidate.access_token);
        if (!page) throw new Error("Aucune Page Facebook liée à un compte Instagram professionnel n'a été trouvée.");

        const instagram = page.instagram_business_account;
        const expiresAt = userToken.expires_in
            ? new Date(Date.now() + Number(userToken.expires_in) * 1000).toISOString()
            : null;

        await supabaseRequest("/rest/v1/instagram_connections?on_conflict=studio_user_id", {
            method: "POST",
            headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
            body: JSON.stringify({
                studio_user_id: oauthState.studio_user_id,
                instagram_account_id: String(instagram.id),
                instagram_username: instagram.username || null,
                facebook_page_id: String(page.id),
                facebook_page_name: page.name || null,
                page_access_token: page.access_token,
                token_expires_at: expiresAt,
                updated_at: new Date().toISOString()
            })
        });
        await supabaseRequest(`/rest/v1/instagram_oauth_states?state=eq.${encodeURIComponent(state)}`, { method: "DELETE" });

        return completionPage(true, `Le compte @${instagram.username || "Instagram"} est prêt à être synchronisé.`);
    } catch (error) {
        console.error("instagram-callback", error);
        return completionPage(false, error.message || "La connexion Instagram n'a pas abouti.");
    }
};
