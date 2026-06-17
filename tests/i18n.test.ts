import { describe, expect, it } from 'vitest';

import {
  formatMonthYear,
  htmlLang,
  localePath,
  pickLocalized,
  toLorrain,
  ui,
  useTranslations,
} from '../src/i18n/ui';

describe('useTranslations', () => {
  it('returns the string for the active language', () => {
    expect(useTranslations('fr')('cat.jeux')).toBe('jeux');
    expect(useTranslations('en')('cat.jeux')).toBe('games');
  });
});

describe('locale key parity', () => {
  it('all locales define exactly the same keys', () => {
    const frKeys = Object.keys(ui.fr).sort();
    expect(Object.keys(ui.en).sort()).toEqual(frKeys);
    expect(Object.keys(ui.lo).sort()).toEqual(frKeys);
  });
});

describe('localePath', () => {
  it('maps each locale to its served path', () => {
    expect(localePath.fr).toBe('/');
    expect(localePath.en).toBe('/en/');
    expect(localePath.lo).toBe('/lorrain/');
  });
});

describe('htmlLang', () => {
  it('keeps real locales and tags Lorrain as a French private subtag', () => {
    expect(htmlLang('fr')).toBe('fr');
    expect(htmlLang('en')).toBe('en');
    expect(htmlLang('lo')).toBe('fr-x-lorrain');
  });
});

describe('Lorrain derivation', () => {
  it('derives the `lo` UI strings from French via lorrainjs', () => {
    expect(ui.lo['site.tagline']).toBe(toLorrain(ui.fr['site.tagline']));
    // The hallmark of the joke: the "gros" suffix.
    expect(ui.lo['site.tagline']).toContain('gros');
  });

  it('pickLocalized derives `lo` from the French text, picks the others as-is', () => {
    const text = { fr: 'Mes projets, en vrac.', en: 'My projects.' };
    expect(pickLocalized(text, 'fr')).toBe(text.fr);
    expect(pickLocalized(text, 'en')).toBe(text.en);
    expect(pickLocalized(text, 'lo')).toBe(toLorrain(text.fr));
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

  it('falls back to the French date format for Lorrain', () => {
    expect(formatMonthYear('2026-05-15T00:00:00Z', 'lo')).toBe(
      formatMonthYear('2026-05-15T00:00:00Z', 'fr'),
    );
  });
});
