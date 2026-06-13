import { afterEach, describe, expect, it } from 'vitest';

import { ghHeaders } from '../src/lib/sources/http';
import {
  buildSubtitlePair,
  detectFrameworks,
  hasAgentMarker,
  mentionsDiscordBot,
  mergeTech,
  normalizeUrl,
  npmUrlIfOwned,
  oldestCommitDate,
  pickFaviconHref,
  pickRepoIconPath,
  prettifyName,
  reusableSubtitle,
  safeHttpUrl,
  topLanguages,
} from '../src/lib/sources';

describe('ghHeaders', () => {
  const original = process.env.GITHUB_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  });
  it('always carries the User-Agent and Accept headers, no auth without a token', () => {
    delete process.env.GITHUB_TOKEN;
    const h = ghHeaders();
    expect(h['User-Agent']).toBe('yavadeus-home-page');
    expect(h.Accept).toBe('application/vnd.github+json');
    expect(h.Authorization).toBeUndefined();
  });
  it('adds a Bearer Authorization header when GITHUB_TOKEN is set', () => {
    process.env.GITHUB_TOKEN = 'tok_123';
    expect(ghHeaders().Authorization).toBe('Bearer tok_123');
  });
});

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

describe('mentionsDiscordBot', () => {
  it('matches "bot Discord" / "Discord bot" in both orders and cases', () => {
    expect(mentionsDiscordBot('Un bot Discord pour gérer le serveur.')).toBe(true);
    expect(mentionsDiscordBot('A small Discord bot written in Node.')).toBe(true);
    expect(mentionsDiscordBot('## DISCORD-BOT')).toBe(true);
  });
  it('ignores a bare reference to a Discord server', () => {
    expect(mentionsDiscordBot('Join our Discord server: https://discord.gg/xyz')).toBe(false);
    expect(mentionsDiscordBot('Built a chat bot for Slack.')).toBe(false);
  });
});

describe('detectFrameworks', () => {
  it('detects React from dependencies', () => {
    expect(detectFrameworks({ dependencies: { react: '^18', 'react-dom': '^18' } })).toEqual([
      'React',
    ]);
  });
  it('reads devDependencies too', () => {
    expect(detectFrameworks({ devDependencies: { astro: '^6' } })).toEqual(['Astro']);
  });
  it('a meta-framework suppresses its redundant base (Next.js implies React)', () => {
    expect(detectFrameworks({ dependencies: { next: '^14', react: '^18' } })).toEqual(['Next.js']);
  });
  it('returns nothing for a plain package or non-object', () => {
    expect(detectFrameworks({ dependencies: { lodash: '^4' } })).toEqual([]);
    expect(detectFrameworks(null)).toEqual([]);
  });
});

describe('mergeTech', () => {
  it('puts frameworks first, then languages, capped', () => {
    expect(mergeTech(['React'], ['TypeScript', 'CSS', 'JavaScript'])).toEqual([
      'React',
      'TypeScript',
      'CSS',
    ]);
  });
  it('dedupes case-insensitively (Vue language + Vue framework)', () => {
    expect(mergeTech(['Vue'], ['Vue', 'HTML'])).toEqual(['Vue', 'HTML']);
  });
  it('falls back to languages when no framework', () => {
    expect(mergeTech([], ['TypeScript', 'CSS'])).toEqual(['TypeScript', 'CSS']);
  });
});

describe('buildSubtitlePair', () => {
  it('English source: original stays en, fr is the translation', () => {
    expect(buildSubtitlePair('A solver', 'en', 'A solver', 'Un solveur')).toEqual({
      fr: 'Un solveur',
      en: 'A solver',
    });
  });
  it('French source: original stays fr, en is the translation', () => {
    expect(buildSubtitlePair('Un solveur', 'fr', 'A solver', '')).toEqual({
      fr: 'Un solveur',
      en: 'A solver',
    });
  });
  it('treats a misdetected French (oc/ca/und) as French', () => {
    expect(buildSubtitlePair('Un solveur', 'oc', 'A solver', '')).toEqual({
      fr: 'Un solveur',
      en: 'A solver',
    });
  });
});

describe('reusableSubtitle', () => {
  const subtitle = { fr: 'Un solveur', en: 'A solver' };
  it('reuses the cached translation when the description is unchanged', () => {
    expect(reusableSubtitle({ description: 'Un solveur', subtitle }, 'Un solveur')).toEqual(
      subtitle,
    );
  });
  it('retranslates when the description changed', () => {
    expect(reusableSubtitle({ description: 'Ancien', subtitle }, 'Nouveau')).toBeNull();
  });
  it('does not reuse a failed translation (fr == en), so it self-heals', () => {
    const failed = { fr: 'Un solveur', en: 'Un solveur' };
    expect(
      reusableSubtitle({ description: 'Un solveur', subtitle: failed }, 'Un solveur'),
    ).toBeNull();
  });
  it('returns null with no previous entry or no description', () => {
    expect(reusableSubtitle(undefined, 'x')).toBeNull();
    expect(reusableSubtitle({ description: 'x', subtitle }, null)).toBeNull();
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
