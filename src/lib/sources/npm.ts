/*
 * npm link resolution: a repo links to npm only if a package by its
 * package.json `name` exists AND is maintained by our npm user (so we never
 * link a same-named package owned by someone else).
 */

/** Pure: npm URL for a registry payload, but only if maintained by `npmUser`. */
export function npmUrlIfOwned(registry: unknown, npmUser: string): string | null {
  const r = registry as { name?: string; maintainers?: { name?: string }[] };
  if (!r?.name || !Array.isArray(r.maintainers)) return null;
  return r.maintainers.some((m) => m?.name === npmUser)
    ? `https://www.npmjs.com/package/${r.name}`
    : null;
}

/**
 * npm link for a repo: read its package.json `name`, and link to npm only if a
 * package by that name exists AND is maintained by `npmUser`. Avoids linking a
 * same-named package owned by someone else.
 */
export async function fetchNpmLink(
  repo: string,
  branch: string,
  npmUser: string,
): Promise<string | null> {
  try {
    const pkg = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/package.json`);
    if (!pkg.ok) return null;
    const name = (await pkg.json()).name;
    if (typeof name !== 'string' || !name) return null;
    const npm = await fetch(`https://registry.npmjs.org/${name}`);
    if (!npm.ok) return null;
    return npmUrlIfOwned(await npm.json(), npmUser);
  } catch (err) {
    console.warn(`[sources] npm link ${repo} fetch failed:`, (err as Error).message);
    return null;
  }
}
