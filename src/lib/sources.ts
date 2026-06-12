/*
 * GitHub/npm fetchers, used only by the `fetch` step (`scripts/fetch.ts`).
 * Each call degrades gracefully: on failure the field is just left empty and a
 * warning is logged. `GITHUB_TOKEN` (read lazily) raises the rate limit.
 *
 * The parsing/ranking logic is split into pure helpers (exported, unit-tested);
 * the async functions just do the I/O and delegate.
 */

/** Auth headers, read at call time so the fetch step can inject a resolved token. */
function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'yavadeus-home-page',
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

/** Add a scheme to bare hostnames returned by the GitHub homepage field. */
export function normalizeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** Keep a URL only if it is http(s) - guards against `javascript:` and friends. */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

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

/** Pure: npm URL for a registry payload, but only if maintained by `npmUser`. */
export function npmUrlIfOwned(registry: unknown, npmUser: string): string | null {
  const r = registry as { name?: string; maintainers?: { name?: string }[] };
  if (!r?.name || !Array.isArray(r.maintainers)) return null;
  return r.maintainers.some((m) => m?.name === npmUser)
    ? `https://www.npmjs.com/package/${r.name}`
    : null;
}

/**
 * npm link for a repo: read its package.json `name`, and link to npm only if a
 * package by that name exists AND is maintained by `npmUser`. Avoids linking a
 * same-named package owned by someone else.
 */
export async function fetchNpmLink(
  repo: string,
  branch: string,
  npmUser: string,
): Promise<string | null> {
  try {
    const pkg = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/package.json`);
    if (!pkg.ok) return null;
    const name = (await pkg.json()).name;
    if (typeof name !== 'string' || !name) return null;
    const npm = await fetch(`https://registry.npmjs.org/${name}`);
    if (!npm.ok) return null;
    return npmUrlIfOwned(await npm.json(), npmUser);
  } catch (err) {
    console.warn(`[sources] npm link ${repo} fetch failed:`, (err as Error).message);
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
