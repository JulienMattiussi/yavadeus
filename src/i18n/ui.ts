/*
 * UI strings and locale helpers. Project subtitles are translated in the data
 * (src/data/projects.ts); this file holds the chrome (labels, nav, footer).
 *
 * The `lo` (Lorrain) locale is a gag: it is not authored by hand but derived
 * from the French strings at load time by running them through lorrainjs (our
 * own "Lorraine logger" lib). Same trick for project subtitles, see
 * `pickLocalized`.
 */

import { translate } from 'lorrainjs';

export const languages = { fr: 'FR', en: 'EN', lo: 'LO' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'fr';

/** Full language names, each in its own tongue (used for the switcher a11y). */
export const languageNames: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  lo: 'Lorrain',
};

/** Where each locale is served. FR at "/", EN at "/en/", LO at "/lorrain/". */
export const localePath: Record<Lang, string> = {
  fr: '/',
  en: '/en/',
  lo: '/lorrain/',
};

/*
 * Full lorrain (the lib default): "gros" suffix, "le/la" before names, fruits
 * to mirabelle, and "a" -> "ô". Tune this single object to dial the joke down.
 */
const LORRAIN_OPTIONS = { gros: true, le: true, mirabelle: true, o: true };

/* Lorrain without the "gros" suffix, for short labels where it only clutters. */
const LORRAIN_OPTIONS_NO_GROS = { ...LORRAIN_OPTIONS, gros: false };

/** Derive a Lorrain string from its French source via lorrainjs. */
export function toLorrain(fr: string, options = LORRAIN_OPTIONS): string {
  return translate(fr, options) as string;
}

const base = {
  fr: {
    'site.title': 'yavadeus',
    'site.tagline': 'Mes projets, en vrac.',
    'site.intro': 'Un point central pour ce que je fabrique : jeux, outils, et quelques délires.',
    'cat.jeux': 'jeux',
    'cat.outils': 'outils',
    'cat.delires': 'délires',
    'cat.marmelab': 'marmelab',
    'cat.jeux.desc': 'Des jeux et casse-tête.',
    'cat.outils.desc': 'Des outils qui rendent service (ou presque).',
    'cat.delires.desc': 'Des idées qui ne servent à rien, et fières de l’être.',
    'cat.marmelab.desc': 'Projets liés à Marmelab.',
    'delires.gate': "J'active mon mode « ouvert d'esprit »",
    'link.github': 'code',
    'link.live': 'live',
    'link.npm': 'npm',
    'link.download': 'télécharger',
    'badge.ai': 'IA',
    'badge.ai.title': 'Construit avec un agent IA',
    'badge.wip': 'WIP',
    'badge.wip.title': 'Projet en cours de développement',
    'badge.discord.title': 'Bot Discord',
    'count.projects': 'projets',
    'count.existing': 'existants',
    'search.placeholder': 'rechercher un projet...',
    'search.empty': 'Aucun projet ne correspond.',
    'view.label': 'Voir par',
    'view.label.short': 'Par',
    'view.categories': 'Rubriques',
    'sort.updated': 'Mise à jour',
    'sort.created': 'Création',
    'year.unknown': 'Date inconnue',
    'meta.started': 'Démarré',
    'meta.updated': 'Mis à jour',
    'footer.built': 'Construit avec Astro - auto-généré depuis GitHub & npm.',
    'nav.follow': 'Me suivre',
    'a11y.skip': 'Aller au contenu',
    'a11y.nav': 'Sélecteur de langue',
    'a11y.toolbar': 'Recherche et affichage',
    'a11y.newtab': '(nouvel onglet)',
  },
  en: {
    'site.title': 'yavadeus',
    'site.tagline': 'My projects, all in one place.',
    'site.intro': 'A central hub for the things I build: games, tools, and a few oddities.',
    'cat.jeux': 'games',
    'cat.outils': 'tools',
    'cat.delires': 'oddities',
    'cat.marmelab': 'marmelab',
    'cat.jeux.desc': 'Games and puzzles.',
    'cat.outils.desc': 'Tools that help (more or less).',
    'cat.delires.desc': 'Useless ideas, proudly so.',
    'cat.marmelab.desc': 'Marmelab-related projects.',
    'delires.gate': 'Enable my "open-minded" mode',
    'link.github': 'code',
    'link.live': 'live',
    'link.npm': 'npm',
    'link.download': 'download',
    'badge.ai': 'AI',
    'badge.ai.title': 'Built with an AI agent',
    'badge.wip': 'WIP',
    'badge.wip.title': 'Work in progress',
    'badge.discord.title': 'Discord bot',
    'count.projects': 'projects',
    'count.existing': 'existing',
    'search.placeholder': 'search a project...',
    'search.empty': 'No project matches.',
    'view.label': 'View by',
    'view.label.short': 'By',
    'view.categories': 'Categories',
    'sort.updated': 'Updated',
    'sort.created': 'Created',
    'year.unknown': 'Unknown date',
    'meta.started': 'Started',
    'meta.updated': 'Updated',
    'footer.built': 'Built with Astro - auto-generated from GitHub & npm.',
    'nav.follow': 'Follow me',
    'a11y.skip': 'Skip to content',
    'a11y.nav': 'Language selector',
    'a11y.toolbar': 'Search and view',
    'a11y.newtab': '(opens in a new tab)',
  },
} as const;

export type UIKey = keyof (typeof base)['fr'];

/*
 * Keys translated without the "gros" suffix: short labels (buttons, action
 * links, the IA badge) where the suffix only clutters, plus the search field.
 * The placeholder also dodges a lorrainjs quirk where the suffix mangles a
 * trailing "..." into "gros.. gros.". Tooltips keep the full gag.
 */
const NO_GROS_KEYS: ReadonlySet<UIKey> = new Set([
  'view.categories',
  'sort.created',
  'sort.updated',
  'link.github',
  'link.live',
  'link.npm',
  'link.download',
  'search.placeholder',
  'count.existing',
  'badge.ai',
]);

/* Keys kept verbatim in Lorrain: the brand name must not be mangled. */
const KEEP_FRENCH_KEYS: ReadonlySet<UIKey> = new Set(['site.title']);

/* Lorrain is generated from French: no hand-written `lo` dictionary to maintain. */
const lo = Object.fromEntries(
  Object.entries(base.fr).map(([key, value]) => {
    const k = key as UIKey;
    if (KEEP_FRENCH_KEYS.has(k)) return [key, value];
    return [key, toLorrain(value, NO_GROS_KEYS.has(k) ? LORRAIN_OPTIONS_NO_GROS : LORRAIN_OPTIONS)];
  }),
) as Record<UIKey, string>;

export const ui = { fr: base.fr, en: base.en, lo };

export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/** Pick the right text from a bilingual `{ fr, en }`, deriving `lo` from `fr`. */
export function pickLocalized(text: { fr: string; en: string }, lang: Lang): string {
  return lang === 'lo' ? toLorrain(text.fr) : text[lang];
}

/** Value for the `<html lang>` / `hreflang` attribute (Lorrain is French-based). */
export function htmlLang(lang: Lang): string {
  return lang === 'lo' ? 'fr-x-lorrain' : lang;
}

/** Localized "month year" from an ISO date (e.g. "janv. 2022" / "Jan 2022"). */
export function formatMonthYear(iso: string, lang: Lang): string {
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(iso));
}
