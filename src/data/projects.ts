/*
 * Curated project list (the "hybrid" half of the content model).
 *
 * You own this file: list the projects you want to show and how to categorize
 * them. At build time, src/lib/projects-loader.ts enriches each entry with live
 * metadata from GitHub (description, homepage/live URL, stars, favicon) and npm.
 *
 * Minimal entry = { repo, category }. Everything else is optional override:
 *  - title:     defaults to the prettified repo name
 *  - subtitle:  bilingual { fr, en }; defaults to the GitHub description (both langs)
 *  - live:      defaults to the GitHub "homepage" field
 *  - npm:       npm package name -> adds an npm link (no default)
 *  - download:  release-page URL; defaults to auto-detected latest release that
 *               ships binary assets. set false to opt out of that detection.
 *  - favicon:   automatic by default (live-site favicon, else a program/app icon
 *               committed in the repo). Pass an explicit URL to override, or
 *               false to show no icon.
 *  - thumbnail: "/thumbnails/<id>.png" (put the image in public/thumbnails/) or a URL
 *  - tech:      main technologies; defaults to the repo's top GitHub languages
 *  - ai:        agent name (e.g. "Claude Code") or true if an AI agent helped.
 *               Omit to auto-detect from an AGENTS.md/CLAUDE.md in the repo;
 *               set false to opt out of that detection.
 *  - featured / order / hidden: presentation controls
 */

export const CATEGORIES = ['jeux', 'outils', 'delires'] as const;
export type Category = (typeof CATEGORIES)[number];

export type LocalizedText = { fr: string; en: string };

export interface CuratedProject {
  /** "owner/name" on GitHub. Enrichment source of truth. */
  repo: string;
  category: Category;
  title?: string;
  subtitle?: LocalizedText;
  live?: string;
  npm?: string;
  /** Download link (release page). Omit to auto-detect a release with binary
   * assets; set false to opt out of that detection. */
  download?: string | false;
  favicon?: boolean | string;
  thumbnail?: string;
  /** Main technologies. Defaults to the repo's top GitHub languages. */
  tech?: string[];
  /** true, or the agent name (e.g. "Claude Code"), if an AI agent helped build it. */
  ai?: boolean | string;
  featured?: boolean;
  order?: number;
  hidden?: boolean;
}

/** Default GitHub owner: lets entries use a bare repo name. */
export const GITHUB_USER = 'JulienMattiussi';
/** npm maintainer handle (informational). */
export const NPM_USER = 'yavadeus';

export const projects: CuratedProject[] = [
  // ---------------------------------------------------------------- JEUX
  {
    repo: 'universal-picross',
    category: 'jeux',
    favicon: true,
    featured: true,
    ai: 'Claude Code',
    subtitle: {
      fr: 'Lecteur et solveur universel de jeux de picross.',
      en: 'A universal player and solver for picross games.',
    },
  },
  {
    repo: 'calendar-solver',
    category: 'jeux',
    favicon: true,
    ai: 'Claude Code',
    subtitle: {
      fr: 'Casse-tête : faire correspondre la date du jour avec les bonnes pièces.',
      en: "A puzzle game matching today's date with the right pieces.",
    },
  },
  {
    repo: 'ptitjeux',
    category: 'jeux',
    subtitle: {
      fr: 'Une collection de petits jeux de puzzle en ligne.',
      en: 'A collection of small online puzzle games.',
    },
  },
  {
    repo: 'bingo-builder',
    category: 'jeux',
    subtitle: {
      fr: 'Générer et jouer à des bingos personnalisés entre amis.',
      en: 'Generate and play custom bingo with friends.',
    },
  },

  // -------------------------------------------------------------- OUTILS
  {
    repo: 'deduplicateur',
    category: 'outils',
    featured: true,
    ai: 'Claude Code',
    subtitle: {
      fr: 'Détecter et purger les fichiers en double.',
      en: 'Detect and purge duplicate files.',
    },
  },
  {
    repo: 'fast-emoji',
    category: 'outils',
    ai: 'Claude Code',
    tech: ['JavaScript', 'GNOME Shell', 'Python'],
    subtitle: {
      fr: 'Raccourcis simples pour insérer des emojis partout.',
      en: 'Simple shortcuts to insert emojis anywhere.',
    },
  },
  {
    repo: 'lorrainjs',
    category: 'outils',
    npm: 'lorrainjs',
    subtitle: {
      fr: 'Un logger pour les gens de Lorraine.',
      en: 'A logger for Lorraine people.',
    },
  },
  {
    repo: 'veilleur',
    category: 'outils',
    favicon: true,
    ai: 'Claude Code',
    subtitle: {
      fr: 'Revue de veille tech automatisée pour le dev web.',
      en: 'Automated tech-watch digest for web development.',
    },
  },
  {
    repo: 'marmelab/get-current-day',
    category: 'outils',
    npm: 'get-current-day',
    // GitHub "homepage" points to npm here, so set the live GitHub Page explicitly.
    live: 'https://marmelab.com/get-current-day/',
    subtitle: {
      fr: 'Renvoie le jour courant (publié quotidiennement sur npm).',
      en: 'Returns the current day (published daily to npm).',
    },
  },

  // ------------------------------------------------------------- DÉLIRES
  {
    repo: 'legoroscope',
    category: 'delires',
    favicon: true,
    featured: true,
    ai: 'Claude Code',
    tech: ['Next.js', 'TypeScript', 'Redis'],
    subtitle: {
      fr: 'Horoscope hebdomadaire du Gorafi : bot Discord et appli web.',
      en: 'Weekly Gorafi horoscope: Discord bot and web app.',
    },
  },
  {
    repo: 'tripote-visor',
    category: 'delires',
    favicon: true,
    ai: 'Claude Code',
    subtitle: {
      fr: 'Une plateforme de réservation fictive et improbable.',
      en: 'A fictional, improbable booking platform.',
    },
  },
  {
    repo: 'combien-mieux-que-un',
    category: 'delires',
    favicon: true,
    subtitle: {
      fr: "Combien c'est mieux que 1 ?",
      en: 'How much better than 1 is it?',
    },
  },
  {
    repo: 'balkanoche-prison-calculator',
    category: 'delires',
    favicon: true,
    subtitle: {
      fr: "Calculateur de peine sur l'échelle Balkanoche.",
      en: 'Prison-time calculator on the Balkanoche scale.',
    },
  },
  {
    repo: 'are-you-vulcain',
    category: 'delires',
    favicon: true,
    subtitle: {
      fr: 'Êtes-vous un Vulcain ? Faites le test.',
      en: 'Are you a Vulcan? Take the test.',
    },
  },
];
