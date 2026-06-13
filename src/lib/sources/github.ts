/*
 * GitHub fetchers: repo list, languages, Pages URL, first-commit date, releases,
 * and the AI-agent marker. Each call degrades gracefully (returns a safe
 * fallback and logs a warning) so the build never fails on a network hiccup.
 * Parsing/ranking is split into pure helpers (exported, unit-tested).
 */

import { ghHeaders, normalizeUrl } from './http';

export interface RepoSummary {
  name: string;
  fork: boolean;
  archived: boolean;
  description: string | null;
  homepage: string | null;
  htmlUrl: string;
  stars: number;
  defaultBranch: string;
  pushedAt: string | null;
}

/**
 * All repos owned by a user (paginated). The list endpoint already carries the
 * metadata we need (description, homepage, stars, default branch, fork flag),
 * so callers can auto-discover the catalog in a few requests.
 */
export async function fetchUserRepos(user: string): Promise<RepoSummary[]> {
  const out: RepoSummary[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `https://api.github.com/users/${user}/repos?per_page=100&page=${page}&sort=pushed`,
      { headers: ghHeaders() },
    );
    if (!res.ok) {
      console.warn(`[sources] GitHub repos ${user} page ${page} -> ${res.status}`);
      break;
    }
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const r of arr) {
      out.push({
        name: r.name,
        fork: Boolean(r.fork),
        archived: Boolean(r.archived),
        description: r.description ?? null,
        homepage: r.homepage && r.homepage.trim() !== '' ? normalizeUrl(r.homepage) : null,
        htmlUrl: r.html_url,
        stars: r.stargazers_count ?? 0,
        defaultBranch: r.default_branch ?? 'main',
        pushedAt: r.pushed_at ?? null,
      });
    }
    if (arr.length < 100) break;
  }
  return out;
}

/**
 * The repo's GitHub Pages URL, if Pages is enabled. Used as a live URL fallback
 * when the repo's "homepage" field is empty (a deployed Page often isn't mirrored
 * into that field).
 */
export async function fetchGitHubPagesUrl(repo: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/pages`, { headers: ghHeaders() });
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d.html_url === 'string' ? d.html_url : null;
  } catch (err) {
    console.warn(`[sources] GitHub pages ${repo} fetch failed:`, (err as Error).message);
    return null;
  }
}

/** Tooling languages that are noise as "main technologies" tags. */
const IGNORED_LANGUAGES = new Set(['Makefile', 'Dockerfile', 'Shell', 'Procfile', 'Batchfile']);

/** Pure: rank a GitHub languages map (bytes desc), drop tooling, cap to `limit`. */
export function topLanguages(data: Record<string, number>, limit = 3): string[] {
  return Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
    .filter((lang) => !IGNORED_LANGUAGES.has(lang))
    .slice(0, limit);
}

/** Top languages of a repo (default for a project's "tech" tags). */
export async function fetchGitHubLanguages(repo: string, limit = 3): Promise<string[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/languages`, {
      headers: ghHeaders(),
    });
    if (!res.ok) return [];
    return topLanguages(await res.json(), limit);
  } catch (err) {
    console.warn(`[sources] GitHub languages ${repo} fetch failed:`, (err as Error).message);
    return [];
  }
}

/** Pure: does a repo root listing carry an AI-agent marker? */
export function hasAgentMarker(items: unknown): boolean {
  if (!Array.isArray(items)) return false;
  return items.some((f: { type?: string; name?: string }) => {
    const name = f.name ?? '';
    if (f.type === 'file' && /^(AGENTS|CLAUDE)\.md$/i.test(name)) return true;
    if (f.type === 'dir' && name === '.claude') return true;
    return false;
  });
}

/**
 * Whether the repo root carries an AI-agent marker: an AGENTS.md / CLAUDE.md
 * file, or a .claude directory. One request lists the root tree.
 */
export async function fetchHasAgentMarker(repo: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents`, {
      headers: ghHeaders(),
    });
    if (!res.ok) return false;
    return hasAgentMarker(await res.json());
  } catch (err) {
    console.warn(`[sources] GitHub contents ${repo} fetch failed:`, (err as Error).message);
    return false;
  }
}

/** Pure: oldest commit's date from a commits array (GitHub returns newest first). */
export function oldestCommitDate(commits: unknown): string | null {
  if (!Array.isArray(commits) || commits.length === 0) return null;
  const oldest = commits[commits.length - 1];
  return oldest?.commit?.author?.date ?? oldest?.commit?.committer?.date ?? null;
}

/**
 * Date of the repo's first commit, a reliable "project start" date (the repo
 * `created_at` is unreliable when a repo has been recreated or re-pushed).
 * Uses the per_page=1 + Link "last" page trick to reach the oldest commit.
 */
export async function fetchFirstCommitDate(repo: string): Promise<string | null> {
  try {
    const base = `https://api.github.com/repos/${repo}/commits?per_page=1`;
    const first = await fetch(base, { headers: ghHeaders() });
    if (!first.ok) return null;

    const lastMatch = first.headers.get('link')?.match(/<([^>]+)>;\s*rel="last"/);
    if (lastMatch) {
      const last = await fetch(lastMatch[1], { headers: ghHeaders() });
      if (!last.ok) return null;
      return oldestCommitDate(await last.json());
    }
    return oldestCommitDate(await first.json());
  } catch (err) {
    console.warn(`[sources] GitHub first commit ${repo} fetch failed:`, (err as Error).message);
    return null;
  }
}

export interface ReleaseInfo {
  /** Release page URL (lets the visitor pick the right binary for their OS). */
  url: string;
  /** Release tag, e.g. "v1.3.0". */
  tag: string;
}

/**
 * Latest release of a repo, but only when it ships downloadable binaries
 * (uploaded assets). Surfaces a "download" link for installable apps with no
 * live site or npm package.
 */
export async function fetchGitHubRelease(repo: string): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: ghHeaders(),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const hasAssets = Array.isArray(d.assets) && d.assets.length > 0;
    if (!hasAssets || !d.html_url) return null;
    return { url: d.html_url, tag: d.tag_name ?? '' };
  } catch (err) {
    console.warn(`[sources] GitHub release ${repo} fetch failed:`, (err as Error).message);
    return null;
  }
}

/** Decoded README markdown of a repo (any filename/case), or null. */
export async function fetchReadme(repo: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/readme`, {
      headers: ghHeaders(),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return Buffer.from(d.content ?? '', d.encoding === 'base64' ? 'base64' : 'utf8').toString(
      'utf8',
    );
  } catch (err) {
    console.warn(`[sources] README ${repo} fetch failed:`, (err as Error).message);
    return null;
  }
}

/** "universal-picross" -> "Universal Picross" (used when no title override). */
export function prettifyName(name: string): string {
  return name
    .replace(/[-_.]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
