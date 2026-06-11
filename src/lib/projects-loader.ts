/*
 * Content Layer loader: turns the curated list (src/data/projects.ts) into a
 * fully enriched, schema-validated `projects` collection at build time.
 *
 * Curated value always wins over the fetched one; fetched data only fills gaps.
 * Network failures degrade gracefully (see src/lib/sources.ts).
 */

import {
  GITHUB_USER,
  projects as curated,
  type CuratedProject,
  type LocalizedText,
} from '../data/projects';
import {
  fetchFavicon,
  fetchFirstCommitDate,
  fetchGitHubLanguages,
  fetchGitHubRelease,
  fetchGitHubRepo,
  fetchHasAgentFile,
  fetchNpmPackage,
  fetchRepoIcon,
  prettifyName,
  type ReleaseInfo,
} from './sources';

/** AI-usage marker. `agent` is the named tool when known, else null. */
export type AiInfo = { agent: string | null } | null;

export interface ProjectEntry {
  id: string;
  title: string;
  subtitle: LocalizedText;
  category: CuratedProject['category'];
  github: string;
  live?: string;
  npm?: string;
  download?: ReleaseInfo;
  favicon?: string;
  thumbnail?: string;
  tech: string[];
  ai: AiInfo;
  stars: number;
  /** ISO date of project start (first commit, else repo creation), or null. */
  createdAt: string | null;
  /** ISO date of last activity (last push), or null if unknown. */
  updatedAt: string | null;
  featured: boolean;
  order: number;
}

/** Resolve a curated repo ("name" or "owner/name") to a full "owner/name". */
function fullRepo(repo: string): string {
  return repo.includes('/') ? repo : `${GITHUB_USER}/${repo}`;
}

function repoName(repo: string): string {
  return repo.split('/').pop() as string;
}

async function enrich(p: CuratedProject): Promise<ProjectEntry> {
  const repo = fullRepo(p.repo);
  const name = repoName(repo);

  // Auto-detect AI usage from an AGENTS.md/CLAUDE.md only when not curated.
  const needsAiDetection = p.ai === undefined;
  // Auto-detect a downloadable release only when not curated/opted out.
  const needsReleaseDetection = p.download === undefined;

  const [gh, langs, npm, hasAgentFile, release, firstCommit] = await Promise.all([
    fetchGitHubRepo(repo),
    p.tech ? Promise.resolve([]) : fetchGitHubLanguages(repo),
    p.npm ? fetchNpmPackage(p.npm) : Promise.resolve(null),
    needsAiDetection ? fetchHasAgentFile(repo) : Promise.resolve(false),
    needsReleaseDetection ? fetchGitHubRelease(repo) : Promise.resolve(null),
    fetchFirstCommitDate(repo),
  ]);

  const ghDescription = gh?.description ?? '';
  const subtitle: LocalizedText = p.subtitle ?? {
    fr: ghDescription,
    en: ghDescription,
  };

  const live = p.live ?? gh?.homepage ?? undefined;

  // Icon resolution (automatic unless favicon === false):
  //   explicit URL > live-site favicon > program/app icon committed in the repo.
  let favicon: string | undefined;
  if (typeof p.favicon === 'string') {
    favicon = p.favicon;
  } else if (p.favicon !== false) {
    if (live) favicon = (await fetchFavicon(live)) ?? undefined;
    if (!favicon) favicon = (await fetchRepoIcon(repo, gh?.defaultBranch ?? 'main')) ?? undefined;
  }

  // Resolve AI marker: explicit name > explicit true > auto-detected file > none.
  // `ai: false` in the curated entry opts out of auto-detection.
  let ai: AiInfo = null;
  if (typeof p.ai === 'string') ai = { agent: p.ai };
  else if (p.ai === true) ai = { agent: null };
  else if (p.ai === undefined && hasAgentFile) ai = { agent: null };

  // Resolve download: explicit URL > auto-detected release with assets > none.
  let download: ReleaseInfo | undefined;
  if (typeof p.download === 'string') download = { url: p.download, tag: '' };
  else if (release) download = release;

  return {
    id: name,
    title: p.title ?? prettifyName(name),
    subtitle,
    category: p.category,
    github: gh?.htmlUrl ?? `https://github.com/${repo}`,
    live,
    npm: npm?.url ?? (p.npm ? `https://www.npmjs.com/package/${p.npm}` : undefined),
    download,
    favicon,
    thumbnail: p.thumbnail,
    tech: p.tech ?? langs,
    ai,
    stars: gh?.stars ?? 0,
    createdAt: firstCommit ?? gh?.createdAt ?? null,
    updatedAt: gh?.pushedAt ?? null,
    featured: p.featured ?? false,
    order: p.order ?? 0,
  };
}

export async function loadProjects(): Promise<ProjectEntry[]> {
  const visible = curated.filter((p) => !p.hidden);
  return Promise.all(visible.map(enrich));
}
