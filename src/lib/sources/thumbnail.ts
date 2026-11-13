/*
 * Project thumbnails, generated at fetch time and committed under
 * public/thumbnails/<repo>.webp. A large image made for sharing first (the live
 * site's og:image, else a big README image), nicer than a capture and free of
 * screenshot quota; else a screenshot of the live site via microlink, else any
 * README image, else the npm package page, else GitHub's social-preview image. Images are normalized (sharp) to a card-sized 720x405
 * WebP. Reuse skips unchanged projects so we don't burn the screenshot quota on
 * every fetch (microlink's free plan allows only a handful of calls per day).
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

const THUMBNAILS_DIR = join(process.cwd(), 'public', 'thumbnails');

/** Where a thumbnail came from. */
export type ThumbnailSource = 'og' | 'screenshot' | 'readme' | 'npm' | 'github';

/** Public path served for a repo's thumbnail. */
export function thumbnailPath(repo: string): string {
  return `/thumbnails/${repo}.webp`;
}

/** On-disk path of a repo's committed thumbnail. */
export function thumbnailFile(repo: string): string {
  return join(THUMBNAILS_DIR, `${repo}.webp`);
}

/** Pure: GitHub's auto social-preview image for a repo (fallback when no live site). */
export function githubSocialImageUrl(owner: string, repo: string): string {
  return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
}

/** Shields-style badge URLs, never a product screenshot. */
const BADGE =
  /(shields\.io|badgen\.net|\/badge|badge\.|travis-ci|circleci|codecov|coveralls|app\.netlify|herokucdn|forthebadge|img\.shields|\/workflows\/[^)'"]*badge)/i;

/**
 * Pure: first "big" image in a README (markdown or <img>), resolved to an
 * absolute URL - normally the product screenshot. Skips shields badges, SVGs and
 * icons/logos (small assets) so it lands past the header logo. Null if none.
 */
export function firstReadmeImage(
  markdown: string,
  owner: string,
  repo: string,
  branch: string,
): string | null {
  const re = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)|<img[^>]+src=["']([^"']+)["']/gi;
  for (const m of markdown.matchAll(re)) {
    const url = (m[1] ?? m[2] ?? '').trim();
    if (!url || url.startsWith('data:') || BADGE.test(url)) continue;
    const clean = url.split('?')[0];
    const base = (clean.split('/').pop() ?? '').toLowerCase();
    if (/\.svg$/i.test(clean)) continue;
    if (/(^|\/)icons?\//i.test(clean)) continue;
    if (/\b(icon|logo|favicon|sprite|avatar)\b/i.test(base)) continue;
    const dim = base.match(/(\d{2,4})x(\d{2,4})/);
    if (dim && Math.max(Number(dim[1]), Number(dim[2])) < 256) continue;
    const knownHost = /user-(images|attachments)\.githubusercontent\.com|\/assets\//i.test(url);
    if (!/\.(png|jpe?g|gif|webp)$/i.test(clean) && !knownHost) continue;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${url.replace(/^\.?\//, '')}`;
  }
  return null;
}

/** Pure: a page's og:image URL, resolved against baseUrl. Null if none. */
export function pickOgImage(html: string, baseUrl: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/(property|name)=["']og:image["']/i.test(tag)) continue;
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    try {
      return new URL(content.trim(), baseUrl).href;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Pure: the large-image candidates worth trying, best first (og:image, then the
 * README image). When the previous thumbnail can be reused, only those ranked
 * above its source are tried, so a reused og/README image is not downloaded
 * again while a newly added og:image still replaces a README image.
 */
export function largeImageCandidates(
  ogImage: string | null,
  readmeImage: string | null,
  reusedSource: ThumbnailSource | null,
): { url: string; source: ThumbnailSource }[] {
  const ranked = [
    { url: ogImage, source: 'og' as const },
    { url: readmeImage, source: 'readme' as const },
  ];
  const stop = ranked.findIndex((c) => c.source === reusedSource);
  return (stop === -1 ? ranked : ranked.slice(0, stop)).filter(
    (c): c is { url: string; source: 'og' | 'readme' } => c.url !== null,
  );
}

/**
 * Pure: microlink screenshot API URL for a live site (1200x630 viewport).
 * `patient` waits for the network to settle and allows a long navigation, for
 * slow pages.
 */
export function microlinkScreenshotUrl(siteUrl: string, patient = false): string {
  const params = new URLSearchParams({
    url: siteUrl,
    screenshot: 'true',
    meta: 'false',
    'viewport.width': '1200',
    'viewport.height': '630',
  });
  if (patient) {
    params.set('waitUntil', 'networkidle2');
    params.set('timeout', '40000');
    params.set('waitForTimeout', '4000');
  }
  return `https://api.microlink.io/?${params}`;
}

/**
 * Pure: the previous thumbnail to reuse when the live URL and the last push are
 * both unchanged (a redeploy always follows a push). Returns null otherwise.
 * A generic fallback (npm page, GitHub card) standing in for a live site (the
 * screenshot failed, e.g. quota exhausted) is never reused, so the next fetch
 * retries the screenshot. An entry without a recorded source predates the field
 * and is reused as before.
 */
export function reusableThumbnail(
  prev:
    | {
        homepage: string | null;
        pushedAt: string | null;
        thumbnail: string | null;
        thumbnailSource?: ThumbnailSource | null;
      }
    | undefined,
  cur: { homepage: string | null; pushedAt: string | null },
): string | null {
  if (!prev?.thumbnail) return null;
  if (prev.homepage !== cur.homepage || prev.pushedAt !== cur.pushedAt) return null;
  if (cur.homepage && (prev.thumbnailSource === 'npm' || prev.thumbnailSource === 'github')) {
    return null;
  }
  return prev.thumbnail;
}

/** Width from which an og:image or README image is preferred over a screenshot. */
const LARGE_IMAGE_WIDTH = 1000;

/**
 * Download an image, normalize it, write it under public/thumbnails. Images
 * narrower than `minWidth` are rejected.
 */
async function saveThumbnail(imageUrl: string, repo: string, minWidth = 0): Promise<boolean> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1024) return false; // guard against tiny error/placeholder payloads
    if (minWidth && ((await sharp(buffer).metadata()).width ?? 0) < minWidth) return false;
    mkdirSync(THUMBNAILS_DIR, { recursive: true });
    // Card-sized 720x405 WebP, keeping the top of the page (cover crop).
    await sharp(buffer)
      .resize(720, 405, { fit: 'cover', position: 'top' })
      .webp({ quality: 80 })
      .toFile(thumbnailFile(repo));
    return true;
  } catch (err) {
    console.warn(`[sources] thumbnail ${repo} failed:`, (err as Error).message);
    return false;
  }
}

/** Set once microlink answers 429: no more calls for the rest of this fetch. */
let quotaExhausted = false;

/** Resolve microlink's screenshot image URL for a live site (best-effort). */
async function microlinkScreenshot(siteUrl: string): Promise<string | null> {
  // Fast attempt first, then a patient retry for slow pages: no slowdown on
  // quick sites, only failures pay the longer wait.
  for (const patient of [false, true]) {
    if (quotaExhausted) return null;
    try {
      const res = await fetch(microlinkScreenshotUrl(siteUrl, patient));
      if (res.status === 429) {
        quotaExhausted = true;
        console.warn('[sources] microlink quota exhausted: fallback images until the next fetch');
        return null;
      }
      if (res.ok) {
        const data = (await res.json()) as { data?: { screenshot?: { url?: string } } };
        if (data.data?.screenshot?.url) return data.data.screenshot.url;
      }
    } catch {
      // fall through to the patient pass, else give up
    }
  }
  return null;
}

/**
 * Save the first large (>= 1000px wide) candidate as the thumbnail. Null if none
 * qualifies (absent, too small, or download failed).
 */
export async function largeImageThumbnail(
  repo: string,
  candidates: { url: string; source: ThumbnailSource }[],
): Promise<{ path: string; source: ThumbnailSource } | null> {
  for (const { url, source } of candidates) {
    if (await saveThumbnail(url, repo, LARGE_IMAGE_WIDTH)) {
      return { path: thumbnailPath(repo), source };
    }
  }
  return null;
}

/**
 * Capture a repo's thumbnail once largeImageThumbnail() found nothing, in order
 * of preference: a screenshot of the live site (microlink), else the README image
 * at any size, else the npm package page, else GitHub's social-preview image.
 * Returns its public path and source, or null if all failed.
 */
export async function fetchThumbnail(
  owner: string,
  repo: string,
  homepage: string | null,
  readmeImage: string | null = null,
  npm: string | null = null,
): Promise<{ path: string; source: ThumbnailSource } | null> {
  const saved = (source: ThumbnailSource) => ({ path: thumbnailPath(repo), source });
  if (homepage) {
    const shot = await microlinkScreenshot(homepage);
    if (shot && (await saveThumbnail(shot, repo))) return saved('screenshot');
  }
  if (readmeImage && (await saveThumbnail(readmeImage, repo))) return saved('readme');
  if (npm) {
    const shot = await microlinkScreenshot(npm);
    if (shot && (await saveThumbnail(shot, repo))) return saved('npm');
  }
  if (await saveThumbnail(githubSocialImageUrl(owner, repo), repo)) return saved('github');
  return null;
}
