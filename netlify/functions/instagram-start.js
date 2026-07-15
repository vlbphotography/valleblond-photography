import { facebookAppId, facebookGraphUrl, json, requireInstagramConfiguration, requireStudioAdmin, supabaseRequest } from "./instagram-utils.js";

export default async (request) => {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    try {
        requireInstagramConfiguration();
        const user = await requireStudioAdmin(request);
        const state = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const origin = new URL(request.url).origin;
        const redirectUri = `${origin}/.netlify/functions/instagram-callback`;

        await supabaseRequest("/rest/v1/instagram_oauth_states", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state, studio_user_id: user.id, expires_at: expiresAt })
        });

        // Le compte Instagram de Valleblond étant relié à une Page Facebook,
        // Facebook Login est plus stable que le rôle de testeur Instagram de
        // l'API directe. Seules les Pages administrées par le photographe sont
        // consultées au retour de l'autorisation.
        const authorizationUrl = facebookGraphUrl("dialog/oauth");
        authorizationUrl.host = "www.facebook.com";
        authorizationUrl.pathname = `/${process.env.INSTAGRAM_GRAPH_API_VERSION || "v24.0"}/dialog/oauth`;
        authorizationUrl.searchParams.set("client_id", facebookAppId());
        authorizationUrl.searchParams.set("redirect_uri", redirectUri);
        authorizationUrl.searchParams.set("state", state);
        authorizationUrl.searchParams.set("response_type", "code");
        // business_management est nécessaire lorsque la Page est rattachée à
        // un portefeuille professionnel Meta ; sans elle, Facebook masque la
        // liaison Instagram pourtant valide dans la réponse API.
        authorizationUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,instagram_basic,business_management");

        return json({ authorizationUrl: authorizationUrl.toString() });
    } catch (error) {
        console.error("instagram-start", error);
        return json({ error: error.message || "Connexion Instagram indisponible." }, 400);
    }
};
