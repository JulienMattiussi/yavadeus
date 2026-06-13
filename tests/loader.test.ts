import { describe, expect, it } from 'vitest';

import type { ProjectOverride } from '../src/data/projects';
import type { CachedRepo } from '../src/lib/cache';
import { buildEntry } from '../src/lib/projects-loader';

function cached(over: Partial<CachedRepo> = {}): CachedRepo {
  return {
    description: 'Cached description',
    subtitle: null,
    homepage: 'https://cached.dev',
    htmlUrl: 'https://github.com/user/repo',
    stars: 7,
    defaultBranch: 'main',
    pushedAt: '2026-05-01T00:00:00Z',
    createdAt: '2022-01-01T00:00:00Z',
    languages: ['TypeScript', 'CSS'],
    frameworks: [],
    release: null,
    ai: false,
    favicon: 'https://cached.dev/favicon.svg',
    npm: null,
    discord: false,
    thumbnail: null,
    ...over,
  };
}

describe('buildEntry - cache fills the gaps', () => {
  it('derives everything from the cache for a bare {category}', () => {
    const e = buildEntry('my-repo', { category: 'outils' }, cached());
    expect(e.title).toBe('My Repo');
    expect(e.subtitle).toEqual({ fr: 'Cached description', en: 'Cached description' });
    expect(e.live).toBe('https://cached.dev');
    expect(e.tech).toEqual(['TypeScript', 'CSS']);
    expect(e.favicon).toBe('https://cached.dev/favicon.svg');
    expect(e.github).toBe('https://github.com/user/repo');
    expect(e.stars).toBe(7);
    expect(e.createdAt).toBe('2022-01-01T00:00:00Z');
    expect(e.updatedAt).toBe('2026-05-01T00:00:00Z');
    expect(e.ai).toBeNull();
    expect(e.wip).toBe(false);
  });
  it('uses the cached auto-translated subtitle when present', () => {
    const e = buildEntry(
      'r',
      { category: 'outils' },
      cached({ subtitle: { fr: 'Bonjour', en: 'Hello' } }),
    );
    expect(e.subtitle).toEqual({ fr: 'Bonjour', en: 'Hello' });
  });
  it('a curated subtitle wins over the cached translation', () => {
    const e = buildEntry(
      'r',
      { category: 'outils', subtitle: { fr: 'Manuel', en: 'Manual' } },
      cached({ subtitle: { fr: 'Auto', en: 'Auto' } }),
    );
    expect(e.subtitle).toEqual({ fr: 'Manuel', en: 'Manual' });
  });
});

describe('buildEntry - curated override wins', () => {
  const o: ProjectOverride = {
    category: 'jeux',
    title: 'Custom',
    subtitle: { fr: 'fr', en: 'en' },
    live: 'https://override.dev',
    tech: ['Next.js'],
    favicon: 'https://override.dev/i.png',
    npm: 'my-pkg',
    wip: true,
  };
  const e = buildEntry('r', o, cached());
  it('uses overrides over the cache', () => {
    expect(e.title).toBe('Custom');
    expect(e.subtitle).toEqual({ fr: 'fr', en: 'en' });
    expect(e.live).toBe('https://override.dev');
    expect(e.tech).toEqual(['Next.js']);
    expect(e.favicon).toBe('https://override.dev/i.png');
    expect(e.wip).toBe(true);
  });
  it('builds the npm link from the package name', () => {
    expect(e.npm).toBe('https://www.npmjs.com/package/my-pkg');
  });
});

describe('buildEntry - npm', () => {
  it('uses the auto-detected npm link from the cache', () => {
    const e = buildEntry('r', { category: 'outils' }, cached({ npm: 'https://npm/p' }));
    expect(e.npm).toBe('https://npm/p');
  });
  it('an explicit npm override wins over the cache', () => {
    const e = buildEntry(
      'r',
      { category: 'outils', npm: 'mine' },
      cached({ npm: 'https://npm/p' }),
    );
    expect(e.npm).toBe('https://www.npmjs.com/package/mine');
  });
  it('no npm anywhere => undefined', () => {
    expect(buildEntry('r', { category: 'outils' }, cached({ npm: null })).npm).toBeUndefined();
  });
});

describe('buildEntry - ai resolution', () => {
  it('explicit agent name', () => {
    expect(buildEntry('r', { category: 'jeux', ai: 'Claude Code' }, cached()).ai).toEqual({
      agent: 'Claude Code',
    });
  });
  it('true => generic marker', () => {
    expect(buildEntry('r', { category: 'jeux', ai: true }, cached()).ai).toEqual({ agent: null });
  });
  it('false opts out even if the cache detected a marker', () => {
    expect(buildEntry('r', { category: 'jeux', ai: false }, cached({ ai: true })).ai).toBeNull();
  });
  it('undefined falls back to cache detection', () => {
    expect(buildEntry('r', { category: 'jeux' }, cached({ ai: true })).ai).toEqual({ agent: null });
  });
});

describe('buildEntry - download resolution', () => {
  const release = { url: 'https://github.com/user/repo/releases/tag/v1', tag: 'v1' };
  it('uses the cached release', () => {
    expect(buildEntry('r', { category: 'outils' }, cached({ release })).download).toEqual(release);
  });
  it('explicit URL override', () => {
    const d = buildEntry(
      'r',
      { category: 'outils', download: 'https://dl.dev' },
      cached(),
    ).download;
    expect(d).toEqual({ url: 'https://dl.dev', tag: '' });
  });
  it('false opts out even if the cache has a release', () => {
    expect(
      buildEntry('r', { category: 'outils', download: false }, cached({ release })).download,
    ).toBeUndefined();
  });
});

describe('buildEntry - security (http(s) only)', () => {
  it('drops a non-http live / favicon / download', () => {
    const e = buildEntry(
      'r',
      { category: 'delires', download: 'javascript:alert(1)' },
      cached({ homepage: 'javascript:alert(1)', favicon: 'data:text/html,x' }),
    );
    expect(e.live).toBeUndefined();
    expect(e.favicon).toBeUndefined();
    expect(e.download).toBeUndefined();
  });
  it('favicon:false hides the icon', () => {
    expect(
      buildEntry('r', { category: 'delires', favicon: false }, cached()).favicon,
    ).toBeUndefined();
  });
});
