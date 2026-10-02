/*
 * Stamps new milestone transitions (added / published / out of WIP) into
 * src/data/milestones.json. Chained after `make fetch`, `make curate` and
 * `make categorize`, so it sees both refreshed data and fresh curation. Offline.
 */

import { writeFileSync } from 'node:fs';

import {
  MILESTONES_PATH,
  projectState,
  readMilestones,
  stampMilestones,
} from '../src/lib/milestones';
import { loadProjects } from '../src/lib/projects-loader';

const prev = readMilestones();
const current = Object.fromEntries(loadProjects().map((p) => [p.id, projectState(p)]));
const next = stampMilestones(prev, current, new Date().toISOString());

const changed = Object.keys(next).filter(
  (name) => JSON.stringify(next[name]) !== JSON.stringify(prev[name]),
);
writeFileSync(MILESTONES_PATH, `${JSON.stringify(next, null, 2)}\n`);
console.log(
  changed.length ? `Jalons mis à jour : ${changed.join(', ')}` : 'Jalons : aucun changement.',
);
