const SITE_URL = "https://vlbphotography.netlify.app";
// Cette clé est publique et ne donne accès qu'aux œuvres publiées par les RLS.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhbnd4anpmeGx4dW55bm5teGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTQxNjUsImV4cCI6MjA5OTUzMDE2NX0.B0yzXCKrRrVUVfUMpa_f2fI-TWXQ7VSeaRGIeDwFHaM";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Liste automatiquement les œuvres publiées pour les moteurs de recherche.
export default async () => {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/Artworks?is_published=eq.true&select=id,created_at`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );

  if (!response.ok) {
    return new Response("Sitemap unavailable", { status: 503 });
  }

  const artworks = await response.json();
  const staticUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}/pages/apropos.html`,
    `${SITE_URL}/pages/contact.html`
  ];
  const artworkUrls = artworks.map((artwork) => ({
    loc: `${SITE_URL}/pages/oeuvre.html?id=${encodeURIComponent(artwork.id)}`,
    lastmod: artwork.created_at
  }));
  const urls = [
    ...staticUrls.map((loc) => ({ loc })),
    ...artworkUrls
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, lastmod }) => `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}\n  </url>`).join("\n")}\n</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
