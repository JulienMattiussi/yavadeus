/*
 * Data cache: the snapshot written by `make fetch` and read (offline) by the
 * build and the curation scripts. Decouples the three steps:
 *   fetch  -> writes this cache from GitHub/npm (the only network step)
 *   curate -> edits the catalog using the cache (no network)
 *   build  -> renders the site from the cache (no network)
 *
 * The cache is committed, so deploys build offline (no GITHUB_TOKEN needed).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ReleaseInfo } from './sources';

/** Repo-intrinsic data, independent of the curated overrides. */
export interface CachedRepo {
  description: string | null;
  homepage: string | null;
  htmlUrl: string;
  stars: number;
  defaultBranch: string;
  /** Last activity (last push), ISO 8601. */
  pushedAt: string | null;
  /** Project start (first commit), ISO 8601. */
  createdAt: string | null;
  /** Top GitHub languages. */
  languages: string[];
  /** Latest release with binary assets, or null. */
  release: ReleaseInfo | null;
  /** Whether an AI-agent marker (AGENTS.md/CLAUDE.md/.claude) was found. */
  ai: boolean;
  /** Resolved favicon: site favicon (from homepage) or repo app icon, or null. */
  favicon: string | null;
}

export interface ProjectsCache {
  fetchedAt: string;
  repos: Record<string, CachedRepo>;
}

/** Run from the project root (build, dev and scripts all do). */
export const CACHE_PATH = join(process.cwd(), 'src', 'data', 'projects-cache.json');

export function readCache(): ProjectsCache {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as ProjectsCache;
  } catch {
    throw new Error(
      "Cache de données introuvable ou illisible (src/data/projects-cache.json). Lance d'abord `make fetch`.",
    );
  }
}
