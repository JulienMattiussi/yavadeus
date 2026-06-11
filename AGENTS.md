# yavadeus-home-page

A personal landing page that gathers all of yavadeus' (Julien Mattiussi) side
projects in one place. Static once deployed - only links. Doubles as a CV.

## What this project is

- A single bilingual (FR/EN) page listing personal projects, grouped into three
  categories: **jeux** (games), **outils** (tools), **délires** (oddities).
- Each project shows a title, a short bilingual subtitle, its main technologies,
  whether an AI agent was used, optional preview thumbnail and site favicon, and
  links to GitHub / the live site / npm when they exist.
- **Hybrid-curated content**: you list and categorize projects in a single data
  file; at build time the site enriches each entry with live metadata fetched
  from GitHub and npm. The deployed output is 100% static.

## Stack

- **Astro 6** - static output, no client JS by default
- **Content Layer** (`astro:content`) - a custom build-time loader is the heart
  of the auto-generation
- **i18n** - Astro's native routing: FR at `/`, EN at `/en/`
- **TypeScript strict**
- **Prettier** (with `prettier-plugin-astro`) - formatting
- **npm** - package manager

No framework UI lib, no Tailwind: plain Astro components + scoped CSS + CSS
custom properties.

## Project structure

```
src/
├── data/
│   └── projects.ts          # CURATED list: the file you edit. repo + category + overrides
├── lib/
│   ├── sources.ts           # build-time fetchers: GitHub repo/languages/contents, npm
│   └── projects-loader.ts   # merges curated entries with fetched data -> ProjectEntry[]
├── content.config.ts        # `projects` collection: loader + Zod schema
├── i18n/
│   └── ui.ts                # UI strings (FR/EN) + locale helpers
├── layouts/
│   └── Layout.astro         # <html>, head, fonts
├── components/
│   ├── HomePage.astro       # the page: header + lang switch + categories + footer
│   └── ProjectCard.astro    # one project card
├── pages/
│   ├── index.astro          # FR (lang="fr")
│   └── en/index.astro       # EN (lang="en")
└── styles/
    ├── theme.css            # ALL color/typography tokens (CSS custom properties)
    └── global.css           # reset + base styles
public/
└── thumbnails/              # optional per-project preview images (<id>.png)
```

## Content model (how auto-generation works)

`src/data/projects.ts` exports `projects: CuratedProject[]`. The minimal entry is
`{ repo, category }`. At build, `src/lib/projects-loader.ts` enriches it:

| Field       | Curated override              | Auto-derived from                             |
| ----------- | ----------------------------- | --------------------------------------------- |
| `title`     | `title`                       | prettified repo name                          |
| `subtitle`  | `subtitle {fr,en}`            | GitHub description (same text for both langs) |
| `live`      | `live`                        | GitHub `homepage` field                       |
| `npm`       | `npm` (pkg name)              | -                                             |
| `download`  | `download` (URL)              | latest release page when it ships assets      |
| `favicon`   | URL string (or `false`)       | live-site `<link icon>`, else repo app icon   |
| `tech`      | `tech: string[]`              | top 3 GitHub languages                        |
| `ai`        | agent name / `true` / `false` | presence of `AGENTS.md`/`CLAUDE.md` in repo   |
| `stars`     | -                             | GitHub stargazers                             |
| dates       | -                             | first-commit date + `pushed_at`               |
| `thumbnail` | `thumbnail`                   | - (drop an image in `public/thumbnails/`)     |

**Curated value always wins; fetched data only fills gaps.** Network failures
degrade gracefully (curated values + a build warning). The default GitHub owner
is `JulienMattiussi` (`GITHUB_USER` in the data file); npm handle is `yavadeus`.

Set `GITHUB_TOKEN` in the environment to raise the GitHub API rate limit (the
build makes a few requests per project; unauthenticated is 60/hour).

To refresh the site with up-to-date GitHub/npm data, just rebuild (`make build`).

## Coding rules

- **No em dashes** - never use `-` (U+2014) or `-` (U+2013). Use a regular hyphen
  `-`, a colon, parentheses, or rephrase. Applies to code, UI copy, comments,
  commit messages.
- **TypeScript strict** - no implicit `any`.
- **Code and comments in English.** UI copy is bilingual: chrome strings live in
  `src/i18n/ui.ts`, project subtitles are `{ fr, en }` in `src/data/projects.ts`.
- **All color/typography tokens in `src/styles/theme.css`** as CSS custom
  properties. Never hardcode a color in a component - always `var(--token)`.
- **No Tailwind, no UI framework** - Astro components + scoped `<style>` blocks.
- **No speculative abstractions** - don't add helpers or options not needed by
  the current task.
- **Enrichment is best-effort** - every network fetch in `src/lib/sources.ts`
  must catch errors and return a safe fallback. The build must never fail because
  GitHub or npm is unreachable.
- **Adding a project** = add an entry to `src/data/projects.ts`. Categorization
  and translations are manual; everything else can be left to enrichment.
- **Run `make check` before committing.**

## Commit conventions

- No `Co-Authored-By` trailer.
- No em dashes anywhere.

## Commands

```bash
make install      # npm install
make dev          # Astro dev server, foreground (http://localhost:2107)
make start        # Astro dev server, background (.dev.log + .pid)
make stop         # stop the background dev server
make build        # static build (fetches GitHub/npm metadata)
make preview      # build + preview locally
make refresh      # rebuild with fresh GitHub/npm data
make typecheck    # astro check
make format       # prettier --write
make format-check # prettier --check
make check        # format-check + typecheck + build (CI gate)
make clean        # rm -rf dist .astro
```
