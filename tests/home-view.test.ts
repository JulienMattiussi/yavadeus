import { describe, expect, it } from 'vitest';

import {
  normalizeText,
  textMatches,
  uniqueYearsDesc,
  yearFromTimestamp,
} from '../src/scripts/home-view';

describe('normalizeText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeText('Évadé À Noël')).toBe('evade a noel');
  });
});

describe('textMatches', () => {
  it('an empty query matches everything', () => {
    expect(textMatches('anything', '')).toBe(true);
  });
  it('matches accent- and case-insensitively (query already normalized)', () => {
    expect(textMatches('Un Solveur de Mots Croisés', 'croises')).toBe(true);
  });
  it('does not match when the query is absent', () => {
    expect(textMatches('bingo builder', 'picross')).toBe(false);
  });
});

describe('yearFromTimestamp', () => {
  it('returns the calendar year of a timestamp', () => {
    expect(yearFromTimestamp(Date.parse('2022-05-01T00:00:00Z'))).toBe(2022);
  });
  it('returns 0 for a missing/invalid timestamp', () => {
    expect(yearFromTimestamp(0)).toBe(0);
  });
});

describe('uniqueYearsDesc', () => {
  it('dedupes and sorts most-recent-first', () => {
    expect(uniqueYearsDesc([2022, 2025, 2022, 2019])).toEqual([2025, 2022, 2019]);
  });
  it('puts the unknown-year bucket (0) last', () => {
    expect(uniqueYearsDesc([0, 2023, 0])).toEqual([2023, 0]);
  });
});
