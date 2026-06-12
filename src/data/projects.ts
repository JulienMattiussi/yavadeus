/*
 * Catalog rules (the "curate" half of the content model).
 *
 * `make fetch` snapshots every non-fork repo into src/data/projects-cache.json.
 * A repo appears on the site only once you give it a category here, keyed by
 * repo name. No entry (or no category) => the repo stays hidden. Onboarding a
 * project = add one line below (usually via `make curate`); everything else
 * (description, live URL, tech, dates, stars, icon, release, AI detection) comes
 * from the cache automatically.
 *
 * Optional overrides per project:
 *  - subtitle:  bilingual { fr, en }; defaults to the GitHub description (both langs)
 *  - title:     defaults to the prettified repo name
 *  - live:      defaults to the GitHub "homepage" field
 *  - npm:       npm package name -> adds an npm link
 *  - download:  release-page URL; defaults to an auto-detected release with assets
 *  - favicon:   automatic (live favicon, else repo app icon); URL to override, false to hide
 *  - tech:      defaults to the repo's top GitHub languages
 *  - ai:        auto-detected from AGENTS.md/CLAUDE.md or a .claude dir; true/false to force
 *  - thumbnail: "/thumbnails/<repo>.png" (put the image in public/thumbnails/) or a URL
 *  - wip:       true to flag the project as work in progress (WIP badge)
 *  - featured / order: presentation controls
 */

export const CATEGORIES = ['jeux', 'outils', 'delires', 'marmelab'] as const;
export type Category = (typeof CATEGORIES)[number];

export type LocalizedText = { fr: string; en: string };

export interface ProjectOverride {
  /** Required to show the project. Without it, the discovered repo stays hidden. */
  category: Category;
  title?: string;
  subtitle?: LocalizedText;
  live?: string;
  npm?: string;
  download?: string | false;
  favicon?: boolean | string;
  tech?: string[];
  ai?: boolean | string;
  thumbnail?: string;
  /** Mark the project as work in progress (shows a WIP badge). */
  wip?: boolean;
  featured?: boolean;
  order?: number;
}

/** Keyed by repo name. Add a repo here (with a category) to put it on the page. */
export const projects: Record<string, ProjectOverride> = {
  // CLI_INSERT_PROJECTS (do not remove) -- `make curate` appends entries here
};

/**
 * Repos explicitly set aside: not shown, and skipped by the curation CLI so it
 * never asks about them again. Use for throwaway/private repos.
 */
export const ignored: string[] = [
  // CLI_INSERT_IGNORED (do not remove)
];
