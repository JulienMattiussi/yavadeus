import { describe, expect, it } from 'vitest';

import { formatMonthYear, otherLangPath, ui, useTranslations } from '../src/i18n/ui';

describe('useTranslations', () => {
  it('returns the string for the active language', () => {
    expect(useTranslations('fr')('cat.jeux')).toBe('jeux');
    expect(useTranslations('en')('cat.jeux')).toBe('games');
  });
});

describe('FR/EN key parity', () => {
  it('both locales define exactly the same keys', () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.fr).sort());
  });
});

describe('otherLangPath', () => {
  it('points to the other locale', () => {
    expect(otherLangPath('fr')).toBe('/en/');
    expect(otherLangPath('en')).toBe('/');
  });
});

describe('formatMonthYear', () => {
  it('formats month + year per locale', () => {
    const en = formatMonthYear('2026-05-15T00:00:00Z', 'en');
    const fr = formatMonthYear('2026-05-15T00:00:00Z', 'fr');
    expect(en).toContain('2026');
    expect(en).toContain('May');
    expect(fr).toContain('2026');
    expect(fr.toLowerCase()).toContain('mai');
  });
});
