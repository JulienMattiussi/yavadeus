/*
 * Edits to src/data/projects.ts. The transforms are pure string functions
 * (unit-tested); the `apply*` wrappers do the file I/O.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), '../../src/data/projects.ts');

/** Insert a categorization (or an `ignore`) before the matching CLI marker. */
export function appendToSource(src: string, repo: string, choice: string, wip: boolean): string {
  if (choice === 'ignore') {
    return src.replace('  // CLI_INSERT_IGNORED', `  '${repo}',\n  // CLI_INSERT_IGNORED`);
  }
  const body = wip ? `{ category: '${choice}', wip: true }` : `{ category: '${choice}' }`;
  return src.replace('  // CLI_INSERT_PROJECTS', `  '${repo}': ${body},\n  // CLI_INSERT_PROJECTS`);
}

/** Remove a repo's entry from the `projects` map (brace-balanced) or `ignored`. */
export function removeFromSource(src: string, name: string, where: 'projects' | 'ignored'): string {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (where === 'ignored') return src.replace(new RegExp(`\\n\\s*'${n}',`), '');

  // Key may be quoted ('my-repo') or bare (validIdentifier).
  const m = new RegExp(`\\n(\\s*)(?:'${n}'|${n}):\\s*\\{`).exec(src);
  if (!m) return src;
  let i = m.index + m[0].length - 1; // index of the opening '{'
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  if (src[i] === ',') i++;
  return src.slice(0, m.index) + src.slice(i);
}

/** Empty both the `projects` map and the `ignored` list (keep types + markers). */
export function clearSource(src: string): string {
  return src
    .replace(/(const projects[^=]*=\s*\{)\n[\s\S]*?(\n {2}\/\/ CLI_INSERT_PROJECTS)/, '$1$2')
    .replace(/(const ignored[^=]*=\s*\[)\n[\s\S]*?(\n {2}\/\/ CLI_INSERT_IGNORED)/, '$1$2');
}

export function applyAppend(repo: string, choice: string, wip: boolean): void {
  writeFileSync(DATA_FILE, appendToSource(readFileSync(DATA_FILE, 'utf8'), repo, choice, wip));
}

export function applyRemove(name: string, where: 'projects' | 'ignored'): void {
  writeFileSync(DATA_FILE, removeFromSource(readFileSync(DATA_FILE, 'utf8'), name, where));
}

export function applyClear(): void {
  writeFileSync(DATA_FILE, clearSource(readFileSync(DATA_FILE, 'utf8')));
}
