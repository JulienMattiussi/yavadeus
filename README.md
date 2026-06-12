# yavadeus-home-page

Personal landing page gathering yavadeus' side projects in one place: games,
tools and oddities. Bilingual (FR/EN), dark/dev aesthetic, fully static once
deployed.

The catalog is **auto-discovered + curated**: a `fetch` step snapshots every
non-fork repo on the GitHub account (description, live URL, technologies, stars,
dates, releases, favicon, npm, AI-usage) into a committed cache; you give repos a
category; the site is then built **offline** from that cache.

## The three steps

```
fetch   →   curate   →   build
(network)   (local)      (offline)
```

- **fetch** (`make fetch`) - the only network step: pulls GitHub/npm data into
  `src/data/projects-cache.json`. Authenticates via `gh auth token` (or `GITHUB_TOKEN`).
- **curate** (`make curate`) - process the snapshot locally: categorize repos,
  mark WIP, ignore, prune deleted ones. Writes to `src/data/projects.ts`.
- **build** (`make build`) - render the static site from the cache. No network,
  no token (so deploys build offline too).

## Quick start

```sh
make install   # install dependencies
make fetch     # snapshot GitHub/npm data into the cache (uses your `gh` login)
make dev       # dev server on http://localhost:2107 (offline)
```

Run `make help` for the full list of commands.

## Generate an up-to-date version (before deploying)

```sh
# 1. Refresh the data snapshot (network; uses your `gh` login, else GITHUB_TOKEN)
make fetch

# 2. (only if repos were created/deleted) reconcile the catalog, then tidy
make curate                            # categorize new repos / prune removed ones
make format

# 3. Build the static site from the cache (offline)
make build

# 4. (optional) preview before deploying
make preview                           # http://localhost:2107
```

The static output is in `./dist`, ready to deploy. To refresh data only (new
stars, releases, pushes…), `make fetch` then `make build` is enough - step 2 is
needed only when the **set** of repos changed.

Because the cache is committed, **deploys build offline and need no token**.

## Adding / organizing projects

A repo shows **only once it has a category**. Two ways to set it:

- **Interactive (recommended)**: `make curate` (or `make categorize`) lists every
  uncategorized non-fork repo (from the cache) and asks for a category (jeux /
  outils / délires / marmelab), whether it is **WIP**, or to **ignore** it. It
  writes your choices into [`src/data/projects.ts`](src/data/projects.ts).
- **By hand**: edit the `projects` map in
  [`src/data/projects.ts`](src/data/projects.ts), keyed by repo name:

  ```ts
  'my-repo': {
    category: 'outils',              // required to show it
    subtitle: { fr: '…', en: '…' },  // optional (else the GitHub description)
    // optional: title, live, npm, download, favicon, tech, ai, thumbnail, wip
  }
  ```

A newly created repo must be `make fetch`-ed first so it lands in the cache, then
categorized. Forks are never shown; `ignored` repos are skipped.

What still has to be written by hand (subtitles, thumbnails, site copy…) is
tracked in [`doc/contenu-a-completer.md`](doc/contenu-a-completer.md).

## How it works

- `scripts/fetch.ts` - the `fetch` step: enriches all non-fork repos into the cache
- `src/data/projects-cache.json` - the committed data snapshot (offline source)
- `src/data/projects.ts` - categories + manual overrides (what you maintain)
- `src/lib/sources.ts` - GitHub/npm fetchers (used only by `fetch`), best-effort
- `src/lib/projects-loader.ts` - merges cache + overrides into the collection (offline)
- `src/content.config.ts` - the `projects` content collection (loader + schema)
- `src/config.ts` + `.env` - identity/URL config (`GITHUB_USER`, `SITE_URL`)
- `scripts/curate.ts` - curation pipeline (`make curate`); steps in `scripts/curation/`
- `tests/` - Vitest unit tests for the pure logic (run by `make test-unit` / `make check`)

See [AGENTS.md](AGENTS.md) for the full architecture and coding rules.

## Stack

Astro 6 (static), Content Layer, native i18n (FR `/`, EN `/en/`), TypeScript
strict, Prettier, Vitest. No UI framework, no Tailwind: Astro components + scoped CSS.
