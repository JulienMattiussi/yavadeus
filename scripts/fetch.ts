/*
 * `make fetch` - the only network step.
 *
 * Resolves a GitHub token (GITHUB_TOKEN env, else `gh auth token`), then lists
 * every non-fork repo on GITHUB_USER's account and enriches each with the
 * repo-intrinsic data the site needs (languages, first commit, release, AI
 * marker, favicon/app icon), and writes the snapshot to
 * src/data/projects-cache.json. `curate` and `build` then run offline.
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { GITHUB_USER, NPM_USER } from '../src/config';
import { CACHE_PATH, type CachedRepo, type ProjectsCache } from '../src/lib/cache';
import {
  fetchFavicon,
  fetchFirstCommitDate,
  fetchGitHubLanguages,
  fetchGitHubPagesUrl,
  fetchGitHubRelease,
  fetchHasAgentMarker,
  fetchNpmLink,
  fetchRepoIcon,
  fetchUserRepos,
  type RepoSummary,
} from '../src/lib/sources';

function fail(message: string): never {
  console.error(`\x1b[31m✗ ${message}\x1b[0m`);
  process.exit(1);
}

/** GITHUB_TOKEN env var, else `gh auth token`. null if neither is available. */
function resolveToken(): { token: string; source: string } | null {
  if (process.env.GITHUB_TOKEN) return { token: process.env.GITHUB_TOKEN, source: 'GITHUB_TOKEN' };
  try {
    const token = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return token ? { token, source: 'gh auth token' } : null;
  } catch {
    return null; // gh missing or not authenticated
  }
}

/** Check the token actually works (401 => invalid/expired). */
async function tokenIsValid(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.github.com/rate_limit', {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'yavadeus-home-page' },
    });
    return res.status !== 401;
  } catch {
    return false;
  }
}

const resolved = resolveToken();
if (!resolved) {
  fail(
    'Aucun token GitHub.\n' +
      '  - Installe et connecte gh : `gh auth login` (puis relance `make fetch`),\n' +
      '  - ou exporte un token : `export GITHUB_TOKEN=ghp_...`.\n' +
      '  (~40 repos x plusieurs appels dépassent la limite anonyme de 60/h.)',
  );
}
if (!(await tokenIsValid(resolved.token))) {
  fail(
    `Token GitHub invalide (401) [source: ${resolved.source}].\n` +
      '  Reconnecte gh (`gh auth login`) ou fournis un GITHUB_TOKEN valide.',
  );
}
process.env.GITHUB_TOKEN = resolved.token; // used by the lazy auth headers in sources.ts
console.log(`Token GitHub OK (source: ${resolved.source}).`);

/** Run an async mapper over items with a small concurrency cap. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function enrich(r: RepoSummary): Promise<CachedRepo> {
  const full = `${GITHUB_USER}/${r.name}`;
  // Live URL: the repo "homepage" field, else its GitHub Pages URL if any.
  const homepage = r.homepage ?? (await fetchGitHubPagesUrl(full));

  const [languages, createdAt, release, ai, npm] = await Promise.all([
    fetchGitHubLanguages(full),
    fetchFirstCommitDate(full),
    fetchGitHubRelease(full),
    fetchHasAgentMarker(full),
    // A repo with a live site is an app, not a published package: skip npm.
    homepage ? Promise.resolve(null) : fetchNpmLink(full, r.defaultBranch, NPM_USER),
  ]);

  // Favicon: prefer the live site's icon, else an app icon committed in the repo.
  let favicon: string | null = null;
  if (homepage) favicon = await fetchFavicon(homepage);
  if (!favicon) favicon = await fetchRepoIcon(full, r.defaultBranch);

  return {
    description: r.description,
    homepage,
    htmlUrl: r.htmlUrl,
    stars: r.stars,
    defaultBranch: r.defaultBranch,
    pushedAt: r.pushedAt,
    createdAt,
    languages,
    release,
    ai,
    favicon,
    npm,
  };
}

const repos = (await fetchUserRepos(GITHUB_USER)).filter((r) => !r.fork);
console.log(`Enrichissement de ${repos.length} repos non-fork...`);

const enriched = await mapLimit(repos, 6, async (r) => [r.name, await enrich(r)] as const);
const cache: ProjectsCache = {
  fetchedAt: new Date().toISOString(),
  repos: Object.fromEntries(enriched),
};

writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
console.log(`Cache écrit : ${repos.length} repos -> src/data/projects-cache.json`);
