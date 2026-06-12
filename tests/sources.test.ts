import { describe, expect, it } from 'vitest';

import {
  hasAgentMarker,
  normalizeUrl,
  npmUrlIfOwned,
  oldestCommitDate,
  pickFaviconHref,
  pickRepoIconPath,
  prettifyName,
  safeHttpUrl,
  topLanguages,
} from '../src/lib/sources';

describe('normalizeUrl', () => {
  it('keeps absolute http(s) URLs', () => {
    expect(normalizeUrl('https://x.dev')).toBe('https://x.dev');
    expect(normalizeUrl('http://x.dev')).toBe('http://x.dev');
  });
  it('adds https:// to bare hostnames', () => {
    expect(normalizeUrl('x.vercel.app')).toBe('https://x.vercel.app');
  });
});

describe('safeHttpUrl', () => {
  it('allows http and https', () => {
    expect(safeHttpUrl('https://x.dev')).toBe('https://x.dev');
    expect(safeHttpUrl('http://x.dev/a')).toBe('http://x.dev/a');
  });
  it('rejects javascript: and other schemes', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpUrl('data:text/html,x')).toBeUndefined();
    expect(safeHttpUrl('file:///etc/passwd')).toBeUndefined();
  });
  it('rejects empty/garbage and null', () => {
    expect(safeHttpUrl('')).toBeUndefined();
    expect(safeHttpUrl('not a url')).toBeUndefined();
    expect(safeHttpUrl(null)).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
  });
});

describe('prettifyName', () => {
  it('turns a repo name into a title', () => {
    expect(prettifyName('universal-picross')).toBe('Universal Picross');
    expect(prettifyName('fast_emoji')).toBe('Fast Emoji');
    expect(prettifyName('glaude.ai')).toBe('Glaude Ai');
  });
});

describe('topLanguages', () => {
  it('orders by bytes desc and caps to the limit', () => {
    expect(topLanguages({ CSS: 10, TypeScript: 100, HTML: 50 }, 2)).toEqual(['TypeScript', 'HTML']);
  });
  it('drops tooling languages (Makefile, etc.)', () => {
    expect(topLanguages({ Makefile: 999, TypeScript: 10, Dockerfile: 500 })).toEqual([
      'TypeScript',
    ]);
  });
  it('returns [] for an empty map', () => {
    expect(topLanguages({})).toEqual([]);
  });
});

describe('oldestCommitDate', () => {
  it('returns the last (oldest) commit date', () => {
    const commits = [
      { commit: { author: { date: '2026-01-01T00:00:00Z' } } },
      { commit: { author: { date: '2022-04-11T12:00:00Z' } } },
    ];
    expect(oldestCommitDate(commits)).toBe('2022-04-11T12:00:00Z');
  });
  it('falls back to committer date', () => {
    expect(oldestCommitDate([{ commit: { committer: { date: '2020-01-01' } } }])).toBe(
      '2020-01-01',
    );
  });
  it('returns null for empty / non-array input', () => {
    expect(oldestCommitDate([])).toBeNull();
    expect(oldestCommitDate(null)).toBeNull();
    expect(oldestCommitDate({})).toBeNull();
  });
});

describe('hasAgentMarker', () => {
  it('detects AGENTS.md / CLAUDE.md files', () => {
    expect(hasAgentMarker([{ type: 'file', name: 'AGENTS.md' }])).toBe(true);
    expect(hasAgentMarker([{ type: 'file', name: 'CLAUDE.md' }])).toBe(true);
  });
  it('detects a .claude directory', () => {
    expect(hasAgentMarker([{ type: 'dir', name: '.claude' }])).toBe(true);
  });
  it('ignores a .claude file or AGENTS.md as a dir', () => {
    expect(hasAgentMarker([{ type: 'file', name: '.claude' }])).toBe(false);
    expect(hasAgentMarker([{ type: 'file', name: 'README.md' }])).toBe(false);
  });
  it('returns false for non-array input', () => {
    expect(hasAgentMarker(null)).toBe(false);
  });
});

describe('npmUrlIfOwned', () => {
  it('links when the package is maintained by our user', () => {
    const reg = { name: 'lorrainjs', maintainers: [{ name: 'someone' }, { name: 'yavadeus' }] };
    expect(npmUrlIfOwned(reg, 'yavadeus')).toBe('https://www.npmjs.com/package/lorrainjs');
  });
  it('returns null when our user is not a maintainer (someone else owns the name)', () => {
    expect(npmUrlIfOwned({ name: 'x', maintainers: [{ name: 'other' }] }, 'yavadeus')).toBeNull();
  });
  it('returns null for malformed payloads', () => {
    expect(npmUrlIfOwned({ name: 'x' }, 'yavadeus')).toBeNull();
    expect(npmUrlIfOwned(null, 'yavadeus')).toBeNull();
  });
});

describe('pickFaviconHref', () => {
  const base = 'https://site.dev';
  it('prefers svg over raster over .ico', () => {
    const html = `
      <link rel="icon" href="/favicon.ico" sizes="256x256" type="image/x-icon"/>
      <link rel="icon" href="/icon.png" type="image/png" sizes="32x32"/>
      <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>`;
    expect(pickFaviconHref(html, base)).toBe('https://site.dev/favicon.svg');
  });
  it('prefers a PNG over a leftover .ico', () => {
    const html = `
      <link rel="icon" href="/favicon.ico" sizes="256x256" type="image/x-icon"/>
      <link rel="icon" href="/icon?abc" type="image/png" sizes="32x32"/>`;
    expect(pickFaviconHref(html, base)).toBe('https://site.dev/icon?abc');
  });
  it('resolves relative hrefs against the base URL', () => {
    expect(pickFaviconHref('<link rel="icon" href="/logo.jpeg">', base)).toBe(
      'https://site.dev/logo.jpeg',
    );
  });
  it('returns null when no icon link is present', () => {
    expect(pickFaviconHref('<link rel="stylesheet" href="/x.css">', base)).toBeNull();
  });
});

describe('pickRepoIconPath', () => {
  it('prefers the master icon.png in an icons dir', () => {
    const tree = [
      { type: 'blob', path: 'src-tauri/icons/32x32.png' },
      { type: 'blob', path: 'src-tauri/icons/icon.png' },
      { type: 'blob', path: 'src-tauri/icons/icon.ico' },
      { type: 'blob', path: 'README.md' },
    ];
    expect(pickRepoIconPath(tree)).toBe('src-tauri/icons/icon.png');
  });
  it('prefers svg, and falls back to the largest sized png', () => {
    expect(pickRepoIconPath([{ type: 'blob', path: 'icons/icon.svg' }])).toBe('icons/icon.svg');
    expect(
      pickRepoIconPath([
        { type: 'blob', path: 'icons/128x128.png' },
        { type: 'blob', path: 'icons/256x256.png' },
      ]),
    ).toBe('icons/256x256.png');
  });
  it('picks a committed favicon.* (e.g. public/favicon.png) when there is no app icon', () => {
    const tree = [
      { type: 'blob', path: 'public/favicon.png' },
      { type: 'blob', path: 'src/assets/banner.png' },
    ];
    expect(pickRepoIconPath(tree)).toBe('public/favicon.png');
  });
  it('prefers a real app icon over a favicon when both exist', () => {
    const tree = [
      { type: 'blob', path: 'public/favicon.png' },
      { type: 'blob', path: 'src-tauri/icons/icon.png' },
    ];
    expect(pickRepoIconPath(tree)).toBe('src-tauri/icons/icon.png');
  });
  it('ignores unrelated images and non-arrays', () => {
    expect(pickRepoIconPath([{ type: 'blob', path: 'screenshots/demo.png' }])).toBeNull();
    expect(pickRepoIconPath(null)).toBeNull();
  });
});
