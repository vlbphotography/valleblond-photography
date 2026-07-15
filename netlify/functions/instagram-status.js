import { json, requireStudioAdmin, supabaseRequest } from "./instagram-utils.js";

export default async (request) => {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    try {
        const user = await requireStudioAdmin(request);
        const connections = await supabaseRequest(`/rest/v1/instagram_connections?studio_user_id=eq.${encodeURIComponent(user.id)}&select=instagram_username,facebook_page_name,last_sync_at`);
        const connection = connections?.[0];
        return json({ connected: Boolean(connection), connection: connection || null });
    } catch (error) {
        console.error("instagram-status", error);
        return json({ error: error.message || "Statut Instagram indisponible." }, 401);
    }
};
