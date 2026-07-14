import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Prerendered to /sitemap.xml: the locale pages, each carrying hreflang
// alternates (mirrors the <link rel="alternate"> tags in Layout.astro).
export const GET: APIRoute = async ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? '';
  // Newest project update = the pages' last-modified signal (all locales share it).
  const projects = await getCollection('projects');
  const updates = projects.map((p) => p.data.updatedAt).filter((d): d is string => Boolean(d));
  const lastmod = updates.sort().at(-1);
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  const alternates =
    `    <xhtml:link rel="alternate" hreflang="fr" href="${base}/" />\n` +
    `    <xhtml:link rel="alternate" hreflang="en" href="${base}/en/" />\n` +
    `    <xhtml:link rel="alternate" hreflang="fr-x-lorrain" href="${base}/lorrain/" />`;
  const urls = ['/', '/en/', '/lorrain/']
    .map((path) => `  <url>\n    <loc>${base}${path}</loc>${lastmodTag}\n${alternates}\n  </url>`)
    .join('\n');
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
