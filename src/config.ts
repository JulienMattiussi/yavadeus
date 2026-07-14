/*
 * Project configuration, read from `.env` (committed, public) and `.env.local`
 * (git-ignored, optional overrides), with real environment variables taking
 * precedence. Single source of truth for identity/URL constants - works both in
 * the Astro build and in the standalone tsx scripts (tsx doesn't auto-load .env,
 * so we parse it ourselves).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Pure: parse `.env` text into a key/value map (skips comments/blank lines). */
export function parseEnvText(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function parseDotEnv(file: string): Record<string, string> {
  try {
    return parseEnvText(readFileSync(join(process.cwd(), file), 'utf8'));
  } catch {
    return {};
  }
}

const env = { ...parseDotEnv('.env'), ...parseDotEnv('.env.local'), ...process.env };

/** GitHub account whose non-fork repos make up the catalog. */
export const GITHUB_USER = env.GITHUB_USER || 'JulienMattiussi';

/** Real name of the site owner, for the Person JSON-LD (rich results). */
export const AUTHOR_NAME = env.AUTHOR_NAME || 'Julien Mattiussi';

/** npm maintainer handle: a package is linked only if maintained by this user. */
export const NPM_USER = env.NPM_USER || 'yavadeus';

/** Production site URL, defined in `.env` (canonical URLs + OG/Twitter tags). */
export const SITE_URL = env.SITE_URL;

/** Optional footer social links, from `.env` (a footer line shows only if set). */
export const LINKEDIN_URL = env.LINKEDIN_URL;
export const BLOG_URL = env.BLOG_URL;
