/*
 * Project thumbnails, generated at fetch time and committed under
 * public/thumbnails/<repo>.png. Screenshot of the live site via microlink, else
 * the first big README image, else the npm package page, else GitHub's
 * social-preview image. Images
 * are normalized to a card-sized 720x405 WebP. Reuse skips unchanged projects so
 * we don't burn the screenshot quota on every fetch.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const THUMBNAILS_DIR = join(process.cwd(), 'public', 'thumbnails');

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
 */
export function reusableThumbnail(
  prev: { homepage: string | null; pushedAt: string | null; thumbnail: string | null } | undefined,
  cur: { homepage: string | null; pushedAt: string | null },
): string | null {
  if (!prev?.thumbnail) return null;
  return prev.homepage === cur.homepage && prev.pushedAt === cur.pushedAt ? prev.thumbnail : null;
}

/** Download an image, normalize to 1200x630, write it under public/thumbnails. */
async function saveThumbnail(imageUrl: string, repo: string): Promise<boolean> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1024) return false; // guard against tiny error/placeholder payloads
    mkdirSync(THUMBNAILS_DIR, { recursive: true });
    const out = thumbnailFile(repo);
    try {
      // Card-sized 720x405 WebP, keeping the top of the page (cover crop).
      execFileSync(
        'convert',
        [
          '-',
          '-resize',
          '720x405^',
          '-gravity',
          'north',
          '-extent',
          '720x405',
          '-quality',
          '80',
          out,
        ],
        { input: buffer },
      );
    } catch {
      writeFileSync(out, buffer); // ImageMagick missing: keep the raw image
    }
    return true;
  } catch (err) {
    console.warn(`[sources] thumbnail ${repo} fetch failed:`, (err as Error).message);
    return false;
  }
}

/** Resolve microlink's screenshot image URL for a live site (best-effort). */
async function microlinkScreenshot(siteUrl: string): Promise<string | null> {
  // Fast attempt first, then a patient retry for slow pages: no slowdown on
  // quick sites, only failures pay the longer wait.
  for (const patient of [false, true]) {
    try {
      const res = await fetch(microlinkScreenshotUrl(siteUrl, patient));
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
 * Capture a repo's thumbnail, in order of preference: screenshot the live site
 * (microlink), else the first big README image, else the npm package page, else
 * GitHub's social-preview image. Returns its public path, or null if all failed.
 */
export async function fetchThumbnail(
  owner: string,
  repo: string,
  homepage: string | null,
  readmeImage: string | null = null,
  npm: string | null = null,
): Promise<string | null> {
  if (homepage) {
    const shot = await microlinkScreenshot(homepage);
    if (shot && (await saveThumbnail(shot, repo))) return thumbnailPath(repo);
  }
  if (readmeImage && (await saveThumbnail(readmeImage, repo))) return thumbnailPath(repo);
  if (npm) {
    const shot = await microlinkScreenshot(npm);
    if (shot && (await saveThumbnail(shot, repo))) return thumbnailPath(repo);
  }
  if (await saveThumbnail(githubSocialImageUrl(owner, repo), repo)) return thumbnailPath(repo);
  return null;
}
