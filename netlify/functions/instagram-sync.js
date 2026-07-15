import {
    cleanCaption,
    facebookGraphUrl,
    json,
    publicArtworkUrl,
    requireStudioAdmin,
    slugFromInstagramId,
    supabaseRequest,
    titleFromCaption
} from "./instagram-utils.js";

function isImage(media) {
    return media?.media_type === "IMAGE" && Boolean(media.media_url);
}

async function findArtwork(mediaId) {
    const artworks = await supabaseRequest(`/rest/v1/Artworks?instagram_media_id=eq.${encodeURIComponent(mediaId)}&select=id`);
    return artworks?.[0] || null;
}

async function uploadPreview(media, timestamp) {
    const imageResponse = await fetch(media.media_url);
    if (!imageResponse.ok) throw new Error("Le fichier preview Instagram n'a pas pu être téléchargé.");

    const contentType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!/^image\/(jpeg|png|webp)$/i.test(contentType)) throw new Error("Instagram n'a pas fourni une image compatible.");

    const contentLength = Number(imageResponse.headers.get("content-length") || 0);
    if (contentLength > 15 * 1024 * 1024) throw new Error("La preview Instagram dépasse 15 Mo.");

    const body = await imageResponse.arrayBuffer();
    if (body.byteLength > 15 * 1024 * 1024) throw new Error("La preview Instagram dépasse 15 Mo.");

    const date = timestamp ? new Date(timestamp) : new Date();
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const storagePath = `instagram/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${media.id}.${extension}`;
    const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/artworks/${storagePath}`, {
        method: "POST",
        headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": contentType,
            "x-upsert": "true"
        },
        body
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Stockage preview : ${error.message || response.status}`);
    }

    return publicArtworkUrl(storagePath);
}

async function importArtwork(media, parentCaption = "", parentTimestamp = null, parentPermalink = null) {
    const existing = await findArtwork(media.id);
    if (existing) return { id: existing.id, created: false };

    const timestamp = parentTimestamp || media.timestamp || new Date().toISOString();
    const caption = cleanCaption(parentCaption || media.caption || "");
    const imageUrl = await uploadPreview(media, timestamp);
    const title = titleFromCaption(caption, timestamp);
    const year = new Date(timestamp).getUTCFullYear();
    const created = await supabaseRequest("/rest/v1/Artworks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
            title,
            slug: slugFromInstagramId(media.id),
            description: caption || null,
            year: Number.isInteger(year) ? year : null,
            image_url: imageUrl,
            is_published: false,
            instagram_media_id: media.id,
            instagram_permalink: parentPermalink || media.permalink || null,
            instagram_imported_at: new Date().toISOString()
        })
    });

    if (!created?.[0]?.id) throw new Error("L'œuvre importée n'a pas été créée.");
    return { id: created[0].id, created: true };
}

async function collectionExists(mediaId) {
    const collections = await supabaseRequest(`/rest/v1/collections?instagram_media_id=eq.${encodeURIComponent(mediaId)}&select=id`);
    return Boolean(collections?.[0]);
}

async function importCarousel(media) {
    if (await collectionExists(media.id)) return { imported: false, artworks: 0, skipped: true };

    const images = (media.children?.data || []).filter(isImage);
    if (images.length < 2) return { imported: false, artworks: 0, skipped: true };

    const caption = cleanCaption(media.caption || "");
    const importedImages = [];
    let createdArtworks = 0;

    for (const image of images) {
        const artwork = await importArtwork(image, caption, media.timestamp, media.permalink);
        importedImages.push(artwork.id);
        if (artwork.created) createdArtworks += 1;
    }

    const title = titleFromCaption(caption, media.timestamp, "Collection Instagram");
    const collection = await supabaseRequest("/rest/v1/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
            title,
            slug: slugFromInstagramId(media.id),
            description: caption || null,
            is_published: false,
            show_items_on_home: false,
            instagram_media_id: media.id,
            instagram_permalink: media.permalink || null,
            instagram_imported_at: new Date().toISOString()
        })
    });
    const collectionId = collection?.[0]?.id;
    if (!collectionId) throw new Error("La collection Instagram n'a pas été créée.");

    await supabaseRequest("/rest/v1/collection_items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importedImages.map((artworkId, index) => ({
            collection_id: collectionId,
            artwork_id: artworkId,
            position: index + 1
        })))
    });

    return { imported: true, artworks: createdArtworks, skipped: false };
}

export default async (request) => {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    try {
        const user = await requireStudioAdmin(request);
        const connections = await supabaseRequest(`/rest/v1/instagram_connections?studio_user_id=eq.${encodeURIComponent(user.id)}&select=instagram_account_id,page_access_token`);
        const connection = connections?.[0];
        if (!connection) return json({ error: "Connecte Instagram avant de synchroniser." }, 400);

        // Cette synchronisation utilise un jeton de Page Facebook. Les médias
        // doivent donc être lus via Graph Facebook, et non Graph Instagram
        // (réservé aux jetons de la connexion Instagram directe).
        const response = await fetch(facebookGraphUrl(`${connection.instagram_account_id}/media`, {
            fields: "id,caption,media_type,media_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}",
            limit: 25,
            access_token: connection.page_access_token
        }));
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message || "Instagram ne répond pas.");

        const result = { artworks: 0, collections: 0, reels: 0, alreadyImported: 0, errors: [] };
        for (const media of payload.data || []) {
            try {
                if (media.media_type === "REELS" || media.media_type === "VIDEO") {
                    result.reels += 1;
                    continue;
                }

                if (media.media_type === "CAROUSEL_ALBUM") {
                    const carousel = await importCarousel(media);
                    result.artworks += carousel.artworks;
                    if (carousel.imported) result.collections += 1;
                    if (carousel.skipped) result.alreadyImported += 1;
                    continue;
                }

                if (!isImage(media)) continue;
                const artwork = await importArtwork(media);
                if (artwork.created) result.artworks += 1;
                else result.alreadyImported += 1;
            } catch (error) {
                console.error("instagram-sync-media", media.id, error);
                result.errors.push(media.id);
            }
        }

        await supabaseRequest(`/rest/v1/instagram_connections?studio_user_id=eq.${encodeURIComponent(user.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        });

        return json(result);
    } catch (error) {
        console.error("instagram-sync", error);
        return json({ error: error.message || "Synchronisation Instagram indisponible." }, 500);
    }
};
