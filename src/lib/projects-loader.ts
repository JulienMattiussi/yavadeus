/*
 * Content Layer loader (offline). Reads the snapshot written by `make fetch`
 * (src/data/projects-cache.json) and merges it with the curated overrides
 * (src/data/projects.ts). A repo shows only if it has a category AND is present
 * in the cache. No network here - run `make fetch` to refresh the data.
 *
 * Curated override always wins; the cache only fills the gaps.
 */

import {
  projects as overrides,
  type Category,
  type LocalizedText,
  type ProjectOverride,
} from '../data/projects';
import { readCache, type CachedRepo } from './cache';
import { mergeTech, prettifyName, safeHttpUrl, type ReleaseInfo } from './sources';

/** AI-usage marker. `agent` is the named tool when known, else null. */
export type AiInfo = { agent: string | null } | null;

export interface ProjectEntry {
  id: string;
  title: string;
  subtitle: LocalizedText;
  category: Category;
  github: string;
  live?: string;
  npm?: string;
  download?: ReleaseInfo;
  favicon?: string;
  thumbnail?: string;
  tech: string[];
  ai: AiInfo;
  wip: boolean;
  discord: boolean;
  stars: number;
  /** ISO date of project start (first commit), or null if unknown. */
  createdAt: string | null;
  /** ISO date of last activity (last push), or null if unknown. */
  updatedAt: string | null;
}

export function buildEntry(name: string, o: ProjectOverride, c: CachedRepo): ProjectEntry {
  let ai: AiInfo = null;
  if (typeof o.ai === 'string') ai = { agent: o.ai };
  else if (o.ai === true) ai = { agent: null };
  else if (o.ai === undefined && c.ai) ai = { agent: null };

  let download: ReleaseInfo | undefined;
  if (typeof o.download === 'string') download = { url: o.download, tag: '' };
  else if (o.download !== false && c.release) download = c.release;
  if (download && !safeHttpUrl(download.url)) download = undefined;

  const favicon =
    typeof o.favicon === 'string' ? o.favicon : o.favicon === false ? null : c.favicon;

  return {
    id: name,
    title: o.title ?? prettifyName(name),
    subtitle: o.subtitle ?? c.subtitle ?? { fr: c.description ?? '', en: c.description ?? '' },
    category: o.category,
    // URLs that originate from fetched data are scheme-checked (http/https only).
    github: safeHttpUrl(c.htmlUrl) ?? `https://github.com/${name}`,
    live: safeHttpUrl(o.live ?? c.homepage),
    npm: o.npm ? `https://www.npmjs.com/package/${o.npm}` : (c.npm ?? undefined),
    download,
    favicon: safeHttpUrl(favicon),
    thumbnail: o.thumbnail ?? c.thumbnail ?? undefined,
    tech: o.tech ?? mergeTech(c.frameworks, c.languages),
    ai,
    wip: o.wip ?? false,
    discord: c.discord,
    stars: c.stars,
    createdAt: c.createdAt,
    updatedAt: c.pushedAt,
  };
}

export function loadProjects(): ProjectEntry[] {
  const cache = readCache();
  const entries: ProjectEntry[] = [];

  for (const [name, o] of Object.entries(overrides)) {
    if (!o.category) continue;
    const c = cache.repos[name];
    if (!c) {
      console.warn(
        `[loader] "${name}" est catégorisé mais absent du cache - relance \`make fetch\`. Ignoré.`,
      );
      continue;
    }
    entries.push(buildEntry(name, o, c));
  }

  return entries;
}
