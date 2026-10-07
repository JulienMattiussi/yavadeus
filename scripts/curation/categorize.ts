/*
 * Curation step: interactive categorization.
 *
 * Lists non-fork repos that have no category yet (and aren't ignored), prompts
 * for a category (or "ignore" / WIP, and the open-minded switch for délires), and writes the choice into
 * src/data/projects.ts. Reusable from both `make categorize` and `make curate`.
 */

import type { Interface } from 'node:readline/promises';

import { CATEGORIES, ignored, projects } from '../../src/data/projects';
import { applyAppend } from './data-edit';

/** Minimal repo info the curation steps need (sourced from the cache). */
export interface RepoEntry {
  name: string;
  description: string | null;
  homepage: string | null;
  stars: number;
}

export interface CurationContext {
  repos: RepoEntry[];
  rl: Interface;
}

export async function categorize({ repos, rl }: CurationContext): Promise<void> {
  const known = new Set([...Object.keys(projects), ...ignored]);
  const todo = repos.filter((r) => !known.has(r.name));

  if (todo.length === 0) {
    console.log('Tout est déjà catégorisé ou ignoré.');
    return;
  }

  console.log(`${todo.length} repo(s) sans catégorie.\n`);
  const menu = CATEGORIES.map((c, i) => `${i + 1}=${c}`).join('  ');
  let done = 0;

  for (const r of todo) {
    console.log(`\x1b[1m${r.name}\x1b[0m  ★${r.stars}`);
    if (r.description) console.log(`  ${r.description}`);
    if (r.homepage) console.log(`  ${r.homepage}`);

    const answer = (await rl.question(`  [${menu}]  i=ignorer  s=passer  q=quitter > `))
      .trim()
      .toLowerCase();

    if (answer === 'q') break;
    if (answer === 's' || answer === '') {
      console.log('  (passé)\n');
      continue;
    }

    let choice: string | null = null;
    if (answer === 'i') choice = 'ignore';
    else {
      const n = Number(answer);
      if (Number.isInteger(n) && n >= 1 && n <= CATEGORIES.length) choice = CATEGORIES[n - 1];
    }

    if (!choice) {
      console.log('  choix invalide, repo passé.\n');
      continue;
    }

    const yes = async (prompt: string) =>
      ['o', 'y', 'oui'].includes((await rl.question(prompt)).trim().toLowerCase());

    let wip = false;
    let openMinded = false;
    if (choice !== 'ignore') wip = await yes('  WIP / en cours ? [o/N] > ');
    if (choice === 'delires') openMinded = await yes('  Switch « ouvert d’esprit » ? [o/N] > ');

    applyAppend(r.name, choice, { wip, openMinded });
    done += 1;
    const tags = [wip && 'WIP', openMinded && 'switch'].filter(Boolean).join(', ');
    console.log(`  \x1b[32m-> ${choice}${tags ? ` (${tags})` : ''}\x1b[0m\n`);
  }

  console.log(`Catégorisation : ${done} repo(s) écrit(s).`);
}
