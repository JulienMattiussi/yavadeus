import { describe, expect, it } from 'vitest';

import { appendToSource, clearSource, removeFromSource } from '../scripts/curation/data-edit';

const SRC = `export const projects = {
  'universal-picross': {
    category: 'jeux',
    subtitle: { fr: 'x', en: 'y' },
  },
  ptitjeux: {
    category: 'jeux',
  },
  // CLI_INSERT_PROJECTS (do not remove)
};

export const ignored: string[] = [
  'old-thing',
  // CLI_INSERT_IGNORED (do not remove)
];
`;

describe('appendToSource', () => {
  it('inserts a categorized entry before the projects marker', () => {
    const out = appendToSource(SRC, 'new-repo', 'outils', false);
    expect(out).toContain("'new-repo': { category: 'outils' },\n  // CLI_INSERT_PROJECTS");
  });
  it('adds wip: true when flagged', () => {
    expect(appendToSource(SRC, 'wip-repo', 'delires', true)).toContain(
      "'wip-repo': { category: 'delires', wip: true },",
    );
  });
  it('inserts into the ignored list for an ignore choice', () => {
    expect(appendToSource(SRC, 'junk', 'ignore', false)).toContain(
      "'junk',\n  // CLI_INSERT_IGNORED",
    );
  });
});

describe('removeFromSource', () => {
  it('removes a quoted multi-line entry, keeping the rest', () => {
    const out = removeFromSource(SRC, 'universal-picross', 'projects');
    expect(out).not.toContain('universal-picross');
    expect(out).toContain('ptitjeux:');
    expect(out).toContain('CLI_INSERT_PROJECTS');
  });
  it('removes a bare-key entry', () => {
    const out = removeFromSource(SRC, 'ptitjeux', 'projects');
    expect(out).not.toContain('ptitjeux:');
    expect(out).toContain('universal-picross');
  });
  it('removes an entry from the ignored list', () => {
    expect(removeFromSource(SRC, 'old-thing', 'ignored')).not.toContain('old-thing');
  });
  it('is a no-op for an unknown name', () => {
    expect(removeFromSource(SRC, 'does-not-exist', 'projects')).toBe(SRC);
  });
});

describe('clearSource', () => {
  it('empties both lists but keeps the markers and structure', () => {
    const out = clearSource(SRC);
    expect(out).not.toContain('universal-picross');
    expect(out).not.toContain('ptitjeux:');
    expect(out).not.toContain('old-thing');
    expect(out).toContain('// CLI_INSERT_PROJECTS');
    expect(out).toContain('// CLI_INSERT_IGNORED');
    expect(out).toContain('export const projects');
    expect(out).toContain('export const ignored');
  });
  it('is idempotent on already-empty source', () => {
    expect(clearSource(clearSource(SRC))).toBe(clearSource(SRC));
  });
});

describe('append then remove round-trips', () => {
  it('a categorized entry can be cleanly removed', () => {
    const added = appendToSource(SRC, 'temp-repo', 'jeux', false);
    expect(added).toContain('temp-repo');
    const removed = removeFromSource(added, 'temp-repo', 'projects');
    expect(removed).not.toContain('temp-repo');
    expect(removed).toContain('CLI_INSERT_PROJECTS');
  });
});
