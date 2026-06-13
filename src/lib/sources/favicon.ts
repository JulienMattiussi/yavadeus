/*
 * Favicon resolution: prefer a live site's <link rel="icon">, else an app icon
 * committed in the repo (Tauri/Electron icons dir or a root icon.png/svg).
 * The picking logic is pure (unit-tested); the async wrappers just do the I/O.
 */

import { ghHeaders } from './http';

/**
 * Pure: pick the best favicon href from a page's HTML, resolved against baseUrl.
 * Sites often list a leftover /favicon.ico first even when the real icon is a
 * PNG/SVG, so prefer modern formats (svg > raster > .ico) then larger sizes.
 */
export function pickFaviconHref(html: string, baseUrl: string): string | null {
  const candidates: { href: string; score: number; size: number }[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel=["'][^"']*icon[^"']*["']/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const type = (tag.match(/type=["']([^"']+)["']/i)?.[1] ?? '').toLowerCase();
    const ext = (href.split('?')[0].split('.').pop() ?? '').toLowerCase();
    const sizes = tag.match(/sizes=["']([^"']+)["']/i)?.[1] ?? '';
    const size = Math.max(0, ...sizes.split(/\D+/).map((n) => Number(n) || 0));
    const isSvg = type.includes('svg') || ext === 'svg';
    const isIco = type.includes('icon') || type.includes('vnd.microsoft') || ext === 'ico';
    const score = isSvg ? 3 : isIco ? 1 : 2;
    candidates.push({ href, score, size });
  }
  candidates.sort((a, b) => b.score - a.score || b.size - a.size);
  if (!candidates[0]) return null;
  try {
    return new URL(candidates[0].href, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Resolve a site's real favicon by reading its <link rel="icon">. Falls back to
 * /favicon.ico only if it actually exists. Returns null otherwise, so the UI
 * shows no icon rather than a broken one.
 */
export async function fetchFavicon(siteUrl: string): Promise<string | null> {
  try {
    const res = await fetch(siteUrl, { headers: { 'User-Agent': 'yavadeus-home-page' } });
    if (!res.ok) return null;
    const picked = pickFaviconHref(await res.text(), siteUrl);
    if (picked) return picked;

    const ico = new URL('/favicon.ico', siteUrl).href;
    const head = await fetch(ico, { method: 'HEAD' });
    return head.ok ? ico : null;
  } catch (err) {
    console.warn(`[sources] favicon ${siteUrl} fetch failed:`, (err as Error).message);
    return null;
  }
}

/**
 * Pure: pick the best app-icon path from a repo git tree (Tauri/Electron icons
 * dir, or a root icon.png/svg). Prefers named master icons, then larger sizes,
 * and avoids .ico (poor in an <img>). Returns the repo-relative path or null.
 */
export function pickRepoIconPath(tree: unknown): string | null {
  if (!Array.isArray(tree)) return null;
  const candidates: { path: string; score: number }[] = [];
  for (const node of tree) {
    if (node?.type !== 'blob' || typeof node.path !== 'string') continue;
    const path: string = node.path;
    if (!/\.(png|svg|ico)$/i.test(path)) continue;
    const base = (path.split('/').pop() ?? '').toLowerCase();
    const inIconsDir = /(^|\/)icons?\//i.test(path);
    const isNamedIcon = /^(icon|app-?icon|logo|favicon)\.(png|svg|ico)$/.test(base);
    if (!inIconsDir && !isNamedIcon) continue;

    const ext = base.split('.').pop() ?? '';
    const stem = base.slice(0, -(ext.length + 1));
    let score: number;
    if (stem === 'icon' || stem === 'app-icon' || stem === 'appicon') score = 900;
    else if (stem === 'favicon' || stem === 'logo') score = 700;
    else {
      const m = base.match(/(\d+)x\d+/);
      score = m ? Number(m[1]) * (base.includes('@2x') ? 2 : 1) : 0;
    }
    if (ext === 'svg') score += 50; // prefer svg within the same name tier
    if (ext === 'ico') score -= 500; // avoid .ico in an <img>
    candidates.push({ path, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.path ?? null;
}

/**
 * Detect a program/app icon committed in the repo. Useful for desktop apps that
 * have no live site. Returns a raw.githubusercontent.com URL, or null.
 */
export async function fetchRepoIcon(repo: string, branch: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: ghHeaders(),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const path = pickRepoIconPath(data.tree);
    return path ? `https://raw.githubusercontent.com/${repo}/${branch}/${path}` : null;
  } catch (err) {
    console.warn(`[sources] repo icon ${repo} fetch failed:`, (err as Error).message);
    return null;
  }
}
