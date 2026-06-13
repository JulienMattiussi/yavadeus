/*
 * Subtitle translation at fetch time: a GitHub description becomes a bilingual
 * {fr,en} pair. The direction/reuse logic is pure (unit-tested); only the
 * network call lives in the async wrapper, with the lib imported dynamically so
 * it stays out of the offline build graph.
 */

/**
 * Pure: place the original description on its own language side and the
 * translation on the other. English source means the original is `en`; anything
 * else (fr, and frequent misdetections like oc/ca on short French text) is
 * treated as French.
 */
export function buildSubtitlePair(
  desc: string,
  sourceIso: string,
  toEn: string,
  toFr: string,
): { fr: string; en: string } {
  return sourceIso.startsWith('en') ? { fr: toFr, en: desc } : { fr: desc, en: toEn };
}

/**
 * Pure: the previous translation to reuse when the description hasn't changed
 * since the last fetch, so we skip the network call. A failed translation
 * (cached as fr == en) is not reused, so a transient error self-heals next time.
 * Returns null when a fresh translation is needed.
 */
export function reusableSubtitle(
  prev: { description: string | null; subtitle: { fr: string; en: string } | null } | undefined,
  description: string | null,
): { fr: string; en: string } | null {
  if (!description || !prev?.subtitle || prev.description !== description) return null;
  return prev.subtitle.fr !== prev.subtitle.en ? prev.subtitle : null;
}

/**
 * Translate a GitHub description into an {fr,en} pair (best-effort). Detects the
 * source via the first call, then only does the second call when the source is
 * English. The translation lib is imported dynamically so it stays out of the
 * offline build graph. On any failure the same text is used for both languages.
 */
export async function fetchSubtitleTranslation(desc: string): Promise<{ fr: string; en: string }> {
  const text = (desc ?? '').trim();
  if (!text) return { fr: '', en: '' };
  try {
    const { default: translate } = await import('google-translate-api-x');
    const toEn = await translate(text, { to: 'en' });
    const src = String(toEn.from?.language?.iso ?? '');
    if (src.startsWith('en')) {
      const toFr = await translate(text, { to: 'fr' });
      return buildSubtitlePair(text, src, String(toEn.text), String(toFr.text));
    }
    return buildSubtitlePair(text, src, String(toEn.text), '');
  } catch (err) {
    console.warn(`[sources] subtitle translation failed:`, (err as Error).message);
    return { fr: text, en: text };
  }
}
