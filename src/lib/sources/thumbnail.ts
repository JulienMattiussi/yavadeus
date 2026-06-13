/*
 * Project thumbnails, generated at fetch time and committed under
 * public/thumbnails/<repo>.png. Screenshot of the live site via microlink, else
 * of the npm package page, else GitHub's social-preview image. Images
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

/** Pure: microlink screenshot API URL for a live site (1200x630 viewport). */
export function microlinkScreenshotUrl(siteUrl: string): string {
  const params = new URLSearchParams({
    url: siteUrl,
    screenshot: 'true',
    meta: 'false',
    'viewport.width': '1200',
    'viewport.height': '630',
  });
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
  try {
    const res = await fetch(microlinkScreenshotUrl(siteUrl));
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { screenshot?: { url?: string } } };
    return data.data?.screenshot?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Capture a repo's thumbnail: screenshot the live site (microlink) when there is
 * one, else the npm package page, else GitHub's social-preview image. Saves it
 * and returns its public path, or null if everything failed.
 */
export async function fetchThumbnail(
  owner: string,
  repo: string,
  homepage: string | null,
  npm: string | null = null,
): Promise<string | null> {
  const liveUrl = homepage ?? npm;
  if (liveUrl) {
    const shot = await microlinkScreenshot(liveUrl);
    if (shot && (await saveThumbnail(shot, repo))) return thumbnailPath(repo);
  }
  if (await saveThumbnail(githubSocialImageUrl(owner, repo), repo)) return thumbnailPath(repo);
  return null;
}
