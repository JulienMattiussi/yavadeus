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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { GITHUB_USER, NPM_USER } from '../src/config';
import { ignored } from '../src/data/projects';
import { CACHE_PATH, type CachedRepo, type ProjectsCache } from '../src/lib/cache';
import {
  fetchFavicon,
  fetchFirstCommitDate,
  fetchGitHubLanguages,
  fetchGitHubPagesUrl,
  fetchGitHubRelease,
  fetchHasAgentMarker,
  fetchIsDiscordBot,
  fetchNpmLink,
  fetchRepoFrameworks,
  fetchRepoIcon,
  fetchSubtitleTranslation,
  fetchThumbnail,
  fetchUserRepos,
  reusableSubtitle,
  reusableThumbnail,
  thumbnailFile,
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

/** The previous snapshot's repos, to reuse unchanged data. Empty on first run. */
function readPreviousRepos(): Record<string, CachedRepo> {
  try {
    return (JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as ProjectsCache).repos ?? {};
  } catch {
    return {};
  }
}

let reusedTranslations = 0;
let reusedThumbnails = 0;

// Repos explicitly set aside never show, so don't spend screenshot quota on them.
const ignoredSet = new Set(ignored);

async function enrich(r: RepoSummary, prev: CachedRepo | undefined): Promise<CachedRepo> {
  const full = `${GITHUB_USER}/${r.name}`;
  // Live URL: the repo "homepage" field, else its GitHub Pages URL if any.
  const homepage = r.homepage ?? (await fetchGitHubPagesUrl(full));

  // Reuse the cached translation when the description is unchanged (no API call).
  const cachedSubtitle = reusableSubtitle(prev, r.description);
  if (cachedSubtitle) reusedTranslations++;

  // Thumbnail (skipped for ignored repos): reuse the committed image when the
  // live URL + last push are unchanged, else capture a fresh one.
  let thumbnail: string | null = null;
  if (!ignoredSet.has(r.name)) {
    const reusedThumb = reusableThumbnail(prev, { homepage, pushedAt: r.pushedAt });
    if (reusedThumb && existsSync(thumbnailFile(r.name))) {
      reusedThumbnails++;
      thumbnail = reusedThumb;
    } else {
      thumbnail = await fetchThumbnail(GITHUB_USER, r.name, homepage);
    }
  }

  const [languages, frameworks, createdAt, release, ai, npm, discord, translated] =
    await Promise.all([
      fetchGitHubLanguages(full),
      fetchRepoFrameworks(full, r.defaultBranch),
      fetchFirstCommitDate(full),
      fetchGitHubRelease(full),
      fetchHasAgentMarker(full),
      // A repo with a live site is an app, not a published package: skip npm.
      homepage ? Promise.resolve(null) : fetchNpmLink(full, r.defaultBranch, NPM_USER),
      fetchIsDiscordBot(full),
      cachedSubtitle ?? fetchSubtitleTranslation(r.description ?? ''),
    ]);

  // Favicon: prefer the live site's icon, else an app icon committed in the repo.
  let favicon: string | null = null;
  if (homepage) favicon = await fetchFavicon(homepage);
  if (!favicon) favicon = await fetchRepoIcon(full, r.defaultBranch);

  return {
    description: r.description,
    subtitle: r.description ? translated : null,
    homepage,
    htmlUrl: r.htmlUrl,
    stars: r.stars,
    defaultBranch: r.defaultBranch,
    pushedAt: r.pushedAt,
    createdAt,
    languages,
    frameworks,
    release,
    ai,
    favicon,
    npm,
    discord,
    thumbnail,
  };
}

const previousRepos = readPreviousRepos();
const repos = (await fetchUserRepos(GITHUB_USER)).filter((r) => !r.fork);
console.log(`Enrichissement de ${repos.length} repos non-fork...`);

const enriched = await mapLimit(
  repos,
  6,
  async (r) => [r.name, await enrich(r, previousRepos[r.name])] as const,
);
console.log(`Traductions : ${reusedTranslations} réutilisées (description inchangée).`);
console.log(`Vignettes : ${reusedThumbnails} réutilisées (live + push inchangés).`);
const cache: ProjectsCache = {
  fetchedAt: new Date().toISOString(),
  repos: Object.fromEntries(enriched),
};

writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
console.log(`Cache écrit : ${repos.length} repos -> src/data/projects-cache.json`);
