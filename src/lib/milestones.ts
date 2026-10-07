/*
 * Milestones: when each listed project was added to the page, first published
 * (live site, release or npm package) and taken out of WIP. Neither GitHub nor
 * the cache records these, so `make fetch` / `make curate` stamp every new
 * transition into the committed src/data/milestones.json (scripts/milestones.ts).
 * The build reads it offline to pick the "latest additions" group.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface MilestoneState {
  published: boolean;
  wip: boolean;
}

export interface Milestone {
  /** Last known state, to detect the next transition. */
  state: MilestoneState;
  addedAt: string;
  publishedAt: string | null;
  unwipAt: string | null;
}

export type Milestones = Record<string, Milestone>;

export const MILESTONES_PATH = join(process.cwd(), 'src', 'data', 'milestones.json');

/** Empty when the file is missing or unreadable: the group then just stays hidden. */
export function readMilestones(): Milestones {
  try {
    return JSON.parse(readFileSync(MILESTONES_PATH, 'utf8')) as Milestones;
  } catch {
    return {};
  }
}

export function projectState(p: {
  live?: string;
  download?: unknown;
  npm?: string;
  wip: boolean;
}): MilestoneState {
  return { published: Boolean(p.live || p.download || p.npm), wip: p.wip };
}

/**
 * Pure: stamp `now` on each transition since `prev`. A repo absent from `prev`
 * was just added (and counts as published now if it already is). Repos no
 * longer listed are dropped, so listing one again stamps it as new.
 */
export function stampMilestones(
  prev: Milestones,
  current: Record<string, MilestoneState>,
  now: string,
): Milestones {
  const next: Milestones = {};
  for (const name of Object.keys(current).sort()) {
    const state = current[name];
    const p = prev[name];
    next[name] = {
      state,
      addedAt: p?.addedAt ?? now,
      publishedAt: state.published && !p?.state.published ? now : (p?.publishedAt ?? null),
      unwipAt: p?.state.wip && !state.wip ? now : (p?.unwipAt ?? null),
    };
  }
  return next;
}

/** Most recent of the three milestones (ISO strings compare chronologically). */
export function latestMilestone(m: Milestone): string {
  return [m.addedAt, m.publishedAt, m.unwipAt].reduce<string>(
    (a, b) => (b && b > a ? b : a),
    m.addedAt,
  );
}

/**
 * Pure: the `limit` projects with the most recent milestone. WIP projects are
 * not eligible. Ties go to the most recently started project.
 */
export function pickLatest<T extends { id: string; wip: boolean; createdAt: string | null }>(
  projects: T[],
  milestones: Milestones,
  limit = 3,
): T[] {
  return projects
    .filter((p) => !p.wip && milestones[p.id])
    .map((p) => ({ p, at: latestMilestone(milestones[p.id]) }))
    .sort(
      (a, b) =>
        b.at.localeCompare(a.at) || (b.p.createdAt ?? '').localeCompare(a.p.createdAt ?? ''),
    )
    .slice(0, limit)
    .map(({ p }) => p);
}
