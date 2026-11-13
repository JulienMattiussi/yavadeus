import { describe, expect, it } from 'vitest';

import {
  firstReadmeImage,
  githubSocialImageUrl,
  largeImageCandidates,
  microlinkScreenshotUrl,
  pickOgImage,
  reusableThumbnail,
  thumbnailPath,
} from '../src/lib/sources/thumbnail';

describe('thumbnailPath', () => {
  it('maps a repo to its public path', () => {
    expect(thumbnailPath('calendar-solver')).toBe('/thumbnails/calendar-solver.webp');
  });
});

describe('githubSocialImageUrl', () => {
  it('builds the opengraph URL for a repo', () => {
    expect(githubSocialImageUrl('JulienMattiussi', 'veilleur')).toBe(
      'https://opengraph.githubassets.com/1/JulienMattiussi/veilleur',
    );
  });
});

describe('microlinkScreenshotUrl', () => {
  it('requests a 1200x630 screenshot of the live site', () => {
    const url = microlinkScreenshotUrl('https://calendar-solver.vercel.app');
    expect(url).toContain('api.microlink.io');
    expect(url).toContain('screenshot=true');
    expect(url).toContain('viewport.width=1200');
    expect(url).toContain(encodeURIComponent('https://calendar-solver.vercel.app'));
  });
  it('adds long-wait params in patient mode (slow pages)', () => {
    const url = microlinkScreenshotUrl('https://mai-rmelab.vercel.app', true);
    expect(url).toContain('waitUntil=networkidle2');
    expect(url).toContain('waitForTimeout=4000');
  });
});

describe('firstReadmeImage', () => {
  const O = 'JulienMattiussi';
  it('skips badges/logos and resolves the first screenshot to a raw URL', () => {
    const md = [
      '# My app',
      '![CI](https://img.shields.io/badge/build-passing-green)',
      '<img src="src-tauri/icons/128x128.png" width="96" />',
      '![screenshot](docs/screenshots/main.png)',
    ].join('\n');
    expect(firstReadmeImage(md, O, 'my-app', 'main')).toBe(
      'https://raw.githubusercontent.com/JulienMattiussi/my-app/main/docs/screenshots/main.png',
    );
  });
  it('keeps an absolute GitHub user-attachment URL', () => {
    const md = '![demo](https://github.com/user-attachments/assets/abc-123)';
    expect(firstReadmeImage(md, O, 'r', 'main')).toBe(
      'https://github.com/user-attachments/assets/abc-123',
    );
  });
  it('skips small fixed-size assets (logo-200x200)', () => {
    const md = '![logo](assets/logo-200x200.png)\n![shot](assets/capture.png)';
    expect(firstReadmeImage(md, O, 'r', 'main')).toBe(
      'https://raw.githubusercontent.com/JulienMattiussi/r/main/assets/capture.png',
    );
  });
  it('returns null when there is only badges/icons', () => {
    const md = '![CI](https://shields.io/x.svg)\n![logo](logo.svg)';
    expect(firstReadmeImage(md, O, 'r', 'main')).toBeNull();
  });
});

describe('pickOgImage', () => {
  const base = 'https://site.dev/app/';
  it('reads og:image whatever the attribute order', () => {
    expect(pickOgImage('<meta content="https://cdn.dev/og.png" property="og:image" />', base)).toBe(
      'https://cdn.dev/og.png',
    );
  });
  it('resolves a relative og:image against the page URL', () => {
    expect(pickOgImage('<meta property="og:image" content="/og.png">', base)).toBe(
      'https://site.dev/og.png',
    );
  });
  it('ignores og:image:alt and returns null without og:image', () => {
    expect(
      pickOgImage('<meta property="og:image:alt" content="x"><meta name="description">', base),
    ).toBeNull();
  });
});

describe('largeImageCandidates', () => {
  it('tries og:image before the README image', () => {
    expect(largeImageCandidates('og.png', 'readme.png', null).map((c) => c.source)).toEqual([
      'og',
      'readme',
    ]);
  });
  it('skips missing images', () => {
    expect(largeImageCandidates(null, 'readme.png', null)).toEqual([
      { url: 'readme.png', source: 'readme' },
    ]);
  });
  it('only tries better sources than a reusable thumbnail', () => {
    expect(largeImageCandidates('og.png', 'readme.png', 'og')).toEqual([]);
    expect(largeImageCandidates('og.png', 'readme.png', 'readme')).toEqual([
      { url: 'og.png', source: 'og' },
    ]);
    expect(largeImageCandidates('og.png', null, 'screenshot')).toHaveLength(1);
  });
});

describe('reusableThumbnail', () => {
  const prev = {
    homepage: 'https://x.vercel.app',
    pushedAt: '2026-05-01T00:00:00Z',
    thumbnail: '/thumbnails/x.webp',
  };
  it('reuses when live URL and last push are unchanged', () => {
    expect(
      reusableThumbnail(prev, {
        homepage: 'https://x.vercel.app',
        pushedAt: '2026-05-01T00:00:00Z',
      }),
    ).toBe('/thumbnails/x.webp');
  });
  it('recaptures when the repo was pushed again', () => {
    expect(
      reusableThumbnail(prev, {
        homepage: 'https://x.vercel.app',
        pushedAt: '2026-06-01T00:00:00Z',
      }),
    ).toBeNull();
  });
  it('recaptures when the live URL changed', () => {
    expect(
      reusableThumbnail(prev, {
        homepage: 'https://y.vercel.app',
        pushedAt: '2026-05-01T00:00:00Z',
      }),
    ).toBeNull();
  });
  it('retries a generic fallback that stands in for a live site', () => {
    for (const source of ['npm', 'github'] as const) {
      expect(
        reusableThumbnail(
          { ...prev, thumbnailSource: source },
          { homepage: 'https://x.vercel.app', pushedAt: '2026-05-01T00:00:00Z' },
        ),
      ).toBeNull();
    }
  });
  it('reuses a live-site screenshot or a README image', () => {
    for (const source of ['screenshot', 'readme'] as const) {
      expect(
        reusableThumbnail(
          { ...prev, thumbnailSource: source },
          { homepage: 'https://x.vercel.app', pushedAt: '2026-05-01T00:00:00Z' },
        ),
      ).toBe('/thumbnails/x.webp');
    }
  });
  it('reuses a fallback when there is no live site to screenshot', () => {
    expect(
      reusableThumbnail(
        {
          homepage: null,
          pushedAt: '2026-05-01T00:00:00Z',
          thumbnail: '/thumbnails/x.webp',
          thumbnailSource: 'npm',
        },
        { homepage: null, pushedAt: '2026-05-01T00:00:00Z' },
      ),
    ).toBe('/thumbnails/x.webp');
  });
  it('returns null with no previous thumbnail', () => {
    expect(
      reusableThumbnail(
        { homepage: 'https://x.vercel.app', pushedAt: '2026-05-01T00:00:00Z', thumbnail: null },
        { homepage: 'https://x.vercel.app', pushedAt: '2026-05-01T00:00:00Z' },
      ),
    ).toBeNull();
  });
});
