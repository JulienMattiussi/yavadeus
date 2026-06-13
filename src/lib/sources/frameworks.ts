/*
 * Framework detection. GitHub's language stats only see file extensions, so a
 * React app reads as "JavaScript"/"TypeScript" and the framework is invisible:
 * we recover it from package.json deps and merge it ahead of the languages.
 */

/**
 * Frameworks worth surfacing as a "main technology". `implies` suppresses a
 * redundant base when a meta-framework is present (Next.js implies React, Nuxt
 * implies Vue, ...). Order = display priority.
 */
const FRAMEWORKS: { dep: string; label: string; implies?: string[] }[] = [
  { dep: 'next', label: 'Next.js', implies: ['React'] },
  { dep: 'nuxt', label: 'Nuxt', implies: ['Vue'] },
  { dep: 'gatsby', label: 'Gatsby', implies: ['React'] },
  { dep: '@remix-run/react', label: 'Remix', implies: ['React'] },
  { dep: 'expo', label: 'React Native', implies: ['React'] },
  { dep: 'react-native', label: 'React Native', implies: ['React'] },
  { dep: '@sveltejs/kit', label: 'SvelteKit', implies: ['Svelte'] },
  { dep: 'react-admin', label: 'React-admin', implies: ['React'] },
  { dep: '@angular/core', label: 'Angular' },
  { dep: 'react', label: 'React' },
  { dep: 'preact', label: 'Preact' },
  { dep: 'vue', label: 'Vue' },
  { dep: 'svelte', label: 'Svelte' },
  { dep: 'solid-js', label: 'Solid' },
  { dep: 'astro', label: 'Astro' },
  { dep: 'phaser', label: 'Phaser' },
  { dep: 'three', label: 'Three.js' },
  { dep: 'pixi.js', label: 'PixiJS' },
  { dep: '@nestjs/core', label: 'NestJS' },
  { dep: 'express', label: 'Express' },
  { dep: 'electron', label: 'Electron' },
  { dep: '@tauri-apps/api', label: 'Tauri' },
];

/** Pure: frameworks declared in a package.json's (dev)dependencies, ranked. */
export function detectFrameworks(pkg: unknown): string[] {
  const p = pkg as {
    dependencies?: Record<string, unknown>;
    devDependencies?: Record<string, unknown>;
  };
  const deps = new Set([
    ...Object.keys(p?.dependencies ?? {}),
    ...Object.keys(p?.devDependencies ?? {}),
  ]);
  const labels: string[] = [];
  const suppressed = new Set<string>();
  for (const { dep, label, implies } of FRAMEWORKS) {
    if (!deps.has(dep)) continue;
    if (!labels.includes(label)) labels.push(label);
    implies?.forEach((i) => suppressed.add(i));
  }
  return labels.filter((l) => !suppressed.has(l));
}

/** Pure: frameworks first, then languages, deduped (case-insensitive), capped. */
export function mergeTech(frameworks: string[], languages: string[], limit = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of [...frameworks, ...languages]) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

/** Frameworks used by a repo, read from its package.json (best-effort). */
export async function fetchRepoFrameworks(repo: string, branch: string): Promise<string[]> {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/package.json`);
    if (!res.ok) return [];
    return detectFrameworks(await res.json());
  } catch (err) {
    console.warn(`[sources] frameworks ${repo} fetch failed:`, (err as Error).message);
    return [];
  }
}
