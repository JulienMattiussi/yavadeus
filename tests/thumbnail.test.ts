import { describe, expect, it } from 'vitest';

import {
  githubSocialImageUrl,
  microlinkScreenshotUrl,
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
  it('returns null with no previous thumbnail', () => {
    expect(
      reusableThumbnail(
        { homepage: 'https://x.vercel.app', pushedAt: '2026-05-01T00:00:00Z', thumbnail: null },
        { homepage: 'https://x.vercel.app', pushedAt: '2026-05-01T00:00:00Z' },
      ),
    ).toBeNull();
  });
});
