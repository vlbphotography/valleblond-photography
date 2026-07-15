import { json, requireStudioAdmin, supabaseRequest } from "./instagram-utils.js";

export default async (request) => {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    try {
        const user = await requireStudioAdmin(request);
        await supabaseRequest(`/rest/v1/instagram_connections?studio_user_id=eq.${encodeURIComponent(user.id)}`, { method: "DELETE" });
        return json({ success: true });
    } catch (error) {
        console.error("instagram-disconnect", error);
        return json({ error: error.message || "Déconnexion Instagram impossible." }, 500);
    }
};
