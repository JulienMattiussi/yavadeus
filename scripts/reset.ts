/*
 * Clears the curated catalog (the `projects` map and `ignored` list) in
 * src/data/projects.ts back to empty, keeping types/comments/markers.
 *
 * Destructive: run via `make clean-data`, which asks for confirmation and also
 * removes the data cache. Not meant to be run directly without that guard.
 */

import { applyClear } from './curation/data-edit';

applyClear();
console.log('Catalogue vidé (projects + ignored).');
