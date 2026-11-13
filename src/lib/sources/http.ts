/* Low-level HTTP/URL helpers shared by the source fetchers. */

/** Auth headers, read at call time so the fetch step can inject a resolved token. */
export function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'yavadeus-home-page',
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

/** A page's HTML (best-effort): null on any network or HTTP error. */
export async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'yavadeus-home-page' } });
    return res.ok ? await res.text() : null;
  } catch (err) {
    console.warn(`[sources] page ${url} fetch failed:`, (err as Error).message);
    return null;
  }
}

/** Add a scheme to bare hostnames returned by the GitHub homepage field. */
export function normalizeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** Keep a URL only if it is http(s) - guards against `javascript:` and friends. */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}
