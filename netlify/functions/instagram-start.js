import { json, requireInstagramConfiguration, requireStudioAdmin, supabaseRequest } from "./instagram-utils.js";

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

        // Instagram Login autorise directement le compte professionnel : il ne
        // passe ni par une Page Facebook ni par Facebook Login for Business.
        const authorizationUrl = new URL("https://www.instagram.com/oauth/authorize");
        authorizationUrl.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID);
        authorizationUrl.searchParams.set("redirect_uri", redirectUri);
        authorizationUrl.searchParams.set("state", state);
        authorizationUrl.searchParams.set("response_type", "code");
        authorizationUrl.searchParams.set("scope", "instagram_business_basic");

        return json({ authorizationUrl: authorizationUrl.toString() });
    } catch (error) {
        console.error("instagram-start", error);
        return json({ error: error.message || "Connexion Instagram indisponible." }, 400);
    }
};
