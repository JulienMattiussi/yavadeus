import { describe, expect, it } from 'vitest';

import {
  latestMilestone,
  pickLatest,
  projectState,
  stampMilestones,
  type Milestones,
} from '../src/lib/milestones';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-02-01T00:00:00.000Z';

describe('projectState', () => {
  it('is published with a live site, a release or an npm package', () => {
    expect(projectState({ wip: false }).published).toBe(false);
    expect(projectState({ live: 'https://a.dev', wip: false }).published).toBe(true);
    expect(projectState({ download: { url: 'u', tag: 'v1' }, wip: false }).published).toBe(true);
    expect(projectState({ npm: 'https://npmjs.com/x', wip: true })).toEqual({
      published: true,
      wip: true,
    });
  });
});

describe('stampMilestones', () => {
  it('stamps a newly listed repo as added (and published if it already is)', () => {
    const next = stampMilestones({}, { a: { published: true, wip: false } }, T0);
    expect(next.a).toEqual({
      state: { published: true, wip: false },
      addedAt: T0,
      publishedAt: T0,
      unwipAt: null,
    });
  });

  it('keeps dates when nothing changed', () => {
    const prev = stampMilestones({}, { a: { published: false, wip: true } }, T0);
    expect(stampMilestones(prev, { a: { published: false, wip: true } }, T1)).toEqual(prev);
  });

  it('stamps publication and the end of WIP on transition', () => {
    const prev = stampMilestones({}, { a: { published: false, wip: true } }, T0);
    const next = stampMilestones(prev, { a: { published: true, wip: false } }, T1);
    expect(next.a).toMatchObject({ addedAt: T0, publishedAt: T1, unwipAt: T1 });
  });

  it('does not re-stamp a repo going back to WIP or unpublished', () => {
    const prev = stampMilestones({}, { a: { published: true, wip: false } }, T0);
    const next = stampMilestones(prev, { a: { published: false, wip: true } }, T1);
    expect(next.a).toMatchObject({ addedAt: T0, publishedAt: T0, unwipAt: null });
  });

  it('drops repos no longer listed', () => {
    const prev = stampMilestones({}, { a: { published: false, wip: false } }, T0);
    expect(stampMilestones(prev, {}, T1)).toEqual({});
  });
});

describe('latestMilestone', () => {
  it('returns the most recent of the three dates', () => {
    const state = { published: true, wip: false };
    expect(latestMilestone({ state, addedAt: T0, publishedAt: null, unwipAt: T1 })).toBe(T1);
    expect(latestMilestone({ state, addedAt: T1, publishedAt: T0, unwipAt: null })).toBe(T1);
  });
});

describe('pickLatest', () => {
  const at = (date: string) => ({
    state: { published: false, wip: false },
    addedAt: date,
    publishedAt: null,
    unwipAt: null,
  });
  const project = (id: string, category: 'jeux' | 'delires' = 'jeux', wip = false) => ({
    id,
    category,
    wip,
    createdAt: null,
  });

  it('keeps the most recent, skipping délires, WIP and unknown projects', () => {
    const milestones: Milestones = {
      old: at('2026-01-01T00:00:00.000Z'),
      mid: at('2026-02-01T00:00:00.000Z'),
      new: at('2026-03-01T00:00:00.000Z'),
      newest: at('2026-04-01T00:00:00.000Z'),
      oddity: at('2026-05-01T00:00:00.000Z'),
      unfinished: at('2026-05-01T00:00:00.000Z'),
    };
    const projects = [
      project('old'),
      project('mid'),
      project('new'),
      project('newest'),
      project('oddity', 'delires'),
      project('unfinished', 'jeux', true),
      project('untracked'),
    ];
    expect(pickLatest(projects, milestones).map((p) => p.id)).toEqual(['newest', 'new', 'mid']);
  });

  it('breaks ties with the most recently started project', () => {
    const milestones: Milestones = { a: at(T0), b: at(T0) };
    const projects = [
      { ...project('a'), createdAt: '2020-01-01' },
      { ...project('b'), createdAt: '2024-01-01' },
    ];
    expect(pickLatest(projects, milestones).map((p) => p.id)).toEqual(['b', 'a']);
  });
});
