/*
 * Curation step: prune stale entries.
 *
 * Finds repo names present in the data (the `projects` map or the `ignored`
 * list) but absent from the freshly fetched repo pool - i.e. repos deleted,
 * renamed or made private since - and asks whether to remove each from
 * src/data/projects.ts. Defaults to "no" so nothing is dropped by accident.
 */

import { ignored, projects } from '../../src/data/projects';
import type { CurationContext } from './categorize';
import { applyRemove } from './data-edit';

export async function prune({ repos, rl }: CurationContext): Promise<void> {
  const present = new Set(repos.map((r) => r.name));
  const inData: { name: string; where: 'projects' | 'ignored' }[] = [
    ...Object.keys(projects).map((name) => ({ name, where: 'projects' as const })),
    ...ignored.map((name) => ({ name, where: 'ignored' as const })),
  ];
  const stale = inData.filter((e) => !present.has(e.name));

  if (stale.length === 0) {
    console.log('Aucune entrée obsolète : toutes les données correspondent à un repo existant.');
    return;
  }

  console.log(
    `${stale.length} entrée(s) introuvable(s) sur GitHub (repo supprimé/privé/renommé) :\n`,
  );
  let removed = 0;

  for (const e of stale) {
    const ans = (await rl.question(`  ${e.name} (${e.where}) - supprimer des données ? [o/N] > `))
      .trim()
      .toLowerCase();
    if (ans === 'o' || ans === 'y' || ans === 'oui') {
      applyRemove(e.name, e.where);
      removed += 1;
      console.log('  \x1b[32m-> supprimé\x1b[0m\n');
    } else {
      console.log('  (gardé)\n');
    }
  }

  console.log(`Nettoyage : ${removed} entrée(s) supprimée(s).`);
}
