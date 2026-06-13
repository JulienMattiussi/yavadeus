import type { APIRoute } from 'astro';

// Prerendered to /sitemap.xml: the two locale pages, each carrying hreflang
// alternates (mirrors the <link rel="alternate"> tags in Layout.astro).
export const GET: APIRoute = ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? '';
  const alternates =
    `    <xhtml:link rel="alternate" hreflang="fr" href="${base}/" />\n` +
    `    <xhtml:link rel="alternate" hreflang="en" href="${base}/en/" />`;
  const urls = ['/', '/en/']
    .map((path) => `  <url>\n    <loc>${base}${path}</loc>\n${alternates}\n  </url>`)
    .join('\n');
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
