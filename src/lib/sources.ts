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
  defaultBranch: string;
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
      defaultBranch: d.default_branch ?? 'main',
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

/**
 * Date of the repo's first commit, a reliable "project start" date (the repo
 * `created_at` is unreliable when a repo has been recreated or re-pushed).
 * Uses the per_page=1 + Link "last" page trick to reach the oldest commit
 * in at most two requests.
 */
export async function fetchFirstCommitDate(repo: string): Promise<string | null> {
  try {
    const base = `https://api.github.com/repos/${repo}/commits?per_page=1`;
    const first = await fetch(base, { headers: GH_HEADERS });
    if (!first.ok) return null;

    const lastMatch = first.headers.get('link')?.match(/<([^>]+)>;\s*rel="last"/);
    let commits: unknown;
    if (lastMatch) {
      const last = await fetch(lastMatch[1], { headers: GH_HEADERS });
      if (!last.ok) return null;
      commits = await last.json();
    } else {
      commits = await first.json();
    }

    if (!Array.isArray(commits) || commits.length === 0) return null;
    const oldest = commits[commits.length - 1];
    return oldest?.commit?.author?.date ?? oldest?.commit?.committer?.date ?? null;
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
 * (uploaded assets). Used to surface a "download" link for installable apps
 * that have no live site or npm package.
 */
export async function fetchGitHubRelease(repo: string): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: GH_HEADERS,
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

/**
 * Resolve a site's real favicon by reading its <link rel="icon"> at build time
 * (many sites serve the icon at /favicon.svg, /logo.png, etc., not /favicon.ico).
 * Falls back to /favicon.ico only if it actually exists. Returns null otherwise,
 * so the UI shows no icon rather than a broken one.
 */
export async function fetchFavicon(siteUrl: string): Promise<string | null> {
  try {
    const res = await fetch(siteUrl, { headers: { 'User-Agent': 'yavadeus-home-page' } });
    if (!res.ok) return null;
    const html = await res.text();

    // Collect every declared icon link, then rank them. Sites often list a
    // leftover /favicon.ico first even when the real icon is a PNG/SVG, so we
    // prefer modern formats (svg > raster > .ico) and larger declared sizes.
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
    if (candidates[0]) return new URL(candidates[0].href, siteUrl).href;

    const ico = new URL('/favicon.ico', siteUrl).href;
    const head = await fetch(ico, { method: 'HEAD' });
    return head.ok ? ico : null;
  } catch (err) {
    console.warn(`[sources] favicon ${siteUrl} fetch failed:`, (err as Error).message);
    return null;
  }
}

/**
 * Detect a program/app icon committed in the repo (e.g. a Tauri/Electron app
 * icon under an `icons/` dir, or a root `icon.png`). Useful for desktop apps
 * that have no live site. Returns a raw.githubusercontent.com URL, or null.
 */
export async function fetchRepoIcon(repo: string, branch: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
      { headers: GH_HEADERS },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.tree)) return null;

    const candidates: { path: string; score: number }[] = [];
    for (const node of data.tree) {
      if (node.type !== 'blob' || typeof node.path !== 'string') continue;
      const path: string = node.path;
      if (!/\.(png|svg|ico)$/i.test(path)) continue;
      const base = (path.split('/').pop() ?? '').toLowerCase();
      const inIconsDir = /(^|\/)icons?\//i.test(path);
      const isNamedIcon = /^(icon|app-?icon|logo)\.(png|svg|ico)$/.test(base);
      if (!inIconsDir && !isNamedIcon) continue;

      const ext = base.split('.').pop() ?? '';
      let score: number;
      if (base === 'icon.svg' || base === 'app-icon.svg') score = 1000;
      else if (base === 'icon.png' || base === 'app-icon.png') score = 900;
      else {
        const m = base.match(/(\d+)x\d+/);
        score = m ? Number(m[1]) * (base.includes('@2x') ? 2 : 1) : 0;
      }
      if (ext === 'ico') score -= 500; // prefer png/svg for an <img>
      candidates.push({ path, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates[0]) return null;
    return `https://raw.githubusercontent.com/${repo}/${branch}/${candidates[0].path}`;
  } catch (err) {
    console.warn(`[sources] repo icon ${repo} fetch failed:`, (err as Error).message);
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
