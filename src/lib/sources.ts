/*
 * Build-time data sources for the hybrid-curated content layer.
 *
 * Each curated project declares a GitHub `owner/repo`; at build time we enrich
 * it with live metadata (description, homepage, stars, favicon) from GitHub and,
 * when relevant, from the npm registry. Everything degrades gracefully: if a
 * fetch fails (offline build, rate limit, 404), the curated values are used and
 * a warning is logged. Set GITHUB_TOKEN to raise the GitHub rate limit.
 */

const GH_HEADERS: Record<string, string> = {
  'User-Agent': 'yavadeus-home-page',
  Accept: 'application/vnd.github+json',
};
if (process.env.GITHUB_TOKEN) {
  GH_HEADERS.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

export interface GitHubRepo {
  description: string | null;
  homepage: string | null;
  htmlUrl: string;
  stars: number;
  /** Project start date (repo creation), ISO 8601. */
  createdAt: string | null;
  /** Last activity (last push), ISO 8601. */
  pushedAt: string | null;
}

export async function fetchGitHubRepo(repo: string): Promise<GitHubRepo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: GH_HEADERS });
    if (!res.ok) {
      console.warn(`[sources] GitHub ${repo} -> ${res.status}; using curated values.`);
      return null;
    }
    const d = await res.json();
    return {
      description: d.description ?? null,
      homepage: d.homepage && d.homepage.trim() !== '' ? normalizeUrl(d.homepage) : null,
      htmlUrl: d.html_url,
      stars: d.stargazers_count ?? 0,
      createdAt: d.created_at ?? null,
      pushedAt: d.pushed_at ?? null,
    };
  } catch (err) {
    console.warn(`[sources] GitHub ${repo} fetch failed:`, (err as Error).message);
    return null;
  }
}

/** Tooling languages that are noise as "main technologies" tags. */
const IGNORED_LANGUAGES = new Set(['Makefile', 'Dockerfile', 'Shell', 'Procfile', 'Batchfile']);

/**
 * Top languages of a repo, ordered by bytes of code (most used first).
 * Used as a default for a project's "tech" tags when none are curated.
 */
export async function fetchGitHubLanguages(repo: string, limit = 3): Promise<string[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/languages`, {
      headers: GH_HEADERS,
    });
    if (!res.ok) return [];
    const d: Record<string, number> = await res.json();
    return Object.entries(d)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang)
      .filter((lang) => !IGNORED_LANGUAGES.has(lang))
      .slice(0, limit);
  } catch (err) {
    console.warn(`[sources] GitHub languages ${repo} fetch failed:`, (err as Error).message);
    return [];
  }
}

/**
 * Whether the repo root contains an AGENTS.md or CLAUDE.md - a strong signal
 * that an AI coding agent was used. One request lists the root tree.
 */
export async function fetchHasAgentFile(repo: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents`, {
      headers: GH_HEADERS,
    });
    if (!res.ok) return false;
    const items = await res.json();
    if (!Array.isArray(items)) return false;
    return items.some(
      (f: { type?: string; name?: string }) =>
        f.type === 'file' && /^(AGENTS|CLAUDE)\.md$/i.test(f.name ?? ''),
    );
  } catch (err) {
    console.warn(`[sources] GitHub contents ${repo} fetch failed:`, (err as Error).message);
    return false;
  }
}

export interface NpmPackage {
  description: string | null;
  url: string;
}

export async function fetchNpmPackage(pkg: string): Promise<NpmPackage | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
    if (!res.ok) {
      console.warn(`[sources] npm ${pkg} -> ${res.status}; skipping npm link.`);
      return null;
    }
    const d = await res.json();
    return {
      description: d.description ?? null,
      url: `https://www.npmjs.com/package/${pkg}`,
    };
  } catch (err) {
    console.warn(`[sources] npm ${pkg} fetch failed:`, (err as Error).message);
    return null;
  }
}

/** Add a scheme to bare hostnames returned by the GitHub homepage field. */
export function normalizeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** Derive a site favicon from a live URL origin (overridable per project). */
export function faviconFromUrl(url: string): string | undefined {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

/** "universal-picross" -> "Universal Picross" (used when no title override). */
export function prettifyName(name: string): string {
  return name
    .replace(/[-_.]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
