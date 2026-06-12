/*
 * Curation pipeline orchestrator (`make curate`).
 *
 * Reads the cache written by `make fetch` (offline), then runs each curation
 * step in sequence, sharing a single interactive prompt. Add new steps to the
 * `steps` array below as they are written (subtitles, thumbnails...).
 *
 * Run `make fetch` first so the repo list is up to date.
 */

import { createInterface } from 'node:readline/promises';

import { readCache } from '../src/lib/cache';
import { categorize, type CurationContext, type RepoEntry } from './curation/categorize';
import { prune } from './curation/prune';

interface Step {
  name: string;
  run: (ctx: CurationContext) => Promise<void>;
}

const steps: Step[] = [
  { name: 'Catégorisation', run: categorize },
  { name: 'Nettoyage (repos supprimés)', run: prune },
  // Ajouter ici les futures étapes de curation, ex. :
  // { name: 'Sous-titres', run: subtitles },
];

const cache = readCache();
const repos: RepoEntry[] = Object.entries(cache.repos).map(([name, c]) => ({
  name,
  description: c.description,
  homepage: c.homepage,
  stars: c.stars,
}));
console.log(`Cache du ${cache.fetchedAt} - ${repos.length} repos.`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
for (const step of steps) {
  console.log(`\n=== ${step.name} ===`);
  await step.run({ repos, rl });
}
rl.close();

console.log("\nCuration terminée. Pense à 'make format' puis 'make build'.");
