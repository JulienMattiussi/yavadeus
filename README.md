# yavadeus-home-page

Personal landing page gathering yavadeus' side projects in one place: games,
tools and oddities. Bilingual (FR/EN), dark/dev aesthetic, fully static once
deployed.

The project list is **hybrid-curated**: you list and categorize projects in one
data file, and the site auto-enriches each one at build time from GitHub and npm
(description, live URL, main technologies, stars, favicon, and whether an AI
agent was used).

## Quick start

```sh
make install   # install dependencies
make dev       # dev server on http://localhost:4321
make build     # static build into ./dist (fetches GitHub/npm metadata)
```

Run `make help` for the full list of commands.

## Adding a project

Edit [`src/data/projects.ts`](src/data/projects.ts) and add an entry:

```ts
{
  repo: 'my-cool-repo',   // owner defaults to JulienMattiussi; or use "owner/name"
  category: 'outils',     // 'jeux' | 'outils' | 'delires'
  subtitle: { fr: '…', en: '…' }, // bilingual; optional (falls back to GitHub description)
  // optional: title, live, npm, favicon, thumbnail, tech, ai, featured, order, hidden
}
```

Everything else (description fallback, live URL, top languages, stars, favicon,
AI-usage detection via `AGENTS.md`/`CLAUDE.md`) is filled in automatically.
Rebuild to refresh: `make build`.

Set `GITHUB_TOKEN` to raise the GitHub API rate limit during the build.

## How it works

- `src/data/projects.ts` - the curated list (what you maintain)
- `src/lib/sources.ts` - build-time fetchers (GitHub, npm), all best-effort
- `src/lib/projects-loader.ts` - merges curated + fetched into the collection
- `src/content.config.ts` - the `projects` content collection (loader + schema)

See [AGENTS.md](AGENTS.md) for the full architecture and coding rules.

## Stack

Astro 6 (static), Content Layer, native i18n (FR `/`, EN `/en/`), TypeScript
strict, Prettier. No UI framework, no Tailwind: Astro components + scoped CSS.
