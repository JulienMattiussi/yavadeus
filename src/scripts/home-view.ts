/*
 * Pure helpers for the HomePage client view (search matching + year grouping).
 * Kept out of the inline <script> so they can be unit-tested without a DOM; the
 * script imports them and keeps only the DOM orchestration.
 */

/** Lowercase + strip diacritics, for accent-insensitive search. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Whether a card's collected search text matches an already-normalized query.
 * An empty query matches everything.
 */
export function textMatches(cardSearch: string, normalizedQuery: string): boolean {
  return normalizedQuery === '' || normalizeText(cardSearch).includes(normalizedQuery);
}

/** Calendar year of a timestamp (ms since epoch), or 0 when missing/invalid. */
export function yearFromTimestamp(ts: number): number {
  return ts > 0 ? new Date(ts).getFullYear() : 0;
}

/** Unique years, most recent first (0 = unknown date, sorts last). */
export function uniqueYearsDesc(years: number[]): number[] {
  return Array.from(new Set(years)).sort((a, b) => b - a);
}
