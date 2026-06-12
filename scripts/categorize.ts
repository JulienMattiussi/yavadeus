/*
 * `make categorize` - runs just the categorization step (offline, on the cache).
 * For the full curation pipeline, use `make curate` (scripts/curate.ts).
 *
 * Run `make fetch` first so the repo list is up to date.
 */

import { createInterface } from 'node:readline/promises';

import { readCache } from '../src/lib/cache';
import { categorize, type RepoEntry } from './curation/categorize';

const cache = readCache();
const repos: RepoEntry[] = Object.entries(cache.repos).map(([name, c]) => ({
  name,
  description: c.description,
  homepage: c.homepage,
  stars: c.stars,
}));

const rl = createInterface({ input: process.stdin, output: process.stdout });
await categorize({ repos, rl });
rl.close();
