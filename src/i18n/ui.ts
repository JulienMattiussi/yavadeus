/*
 * UI strings and locale helpers. Project subtitles are translated in the data
 * (src/data/projects.ts); this file holds the chrome (labels, nav, footer).
 */

export const languages = { fr: 'FR', en: 'EN' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'fr';

export const ui = {
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
    'count.projects': 'projets',
    'search.placeholder': 'rechercher un projet...',
    'search.empty': 'Aucun projet ne correspond.',
    'view.label': 'Voir par',
    'view.categories': 'Rubriques',
    'sort.updated': 'Mise à jour',
    'sort.created': 'Création',
    'year.unknown': 'Date inconnue',
    'meta.started': 'Démarré',
    'meta.updated': 'Mis à jour',
    'footer.built': 'Construit avec Astro - auto-généré depuis GitHub & npm.',
    'lang.switch': 'English',
    'lang.switch.aria': 'Switch to English',
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
    'count.projects': 'projects',
    'search.placeholder': 'search a project...',
    'search.empty': 'No project matches.',
    'view.label': 'View by',
    'view.categories': 'Categories',
    'sort.updated': 'Updated',
    'sort.created': 'Created',
    'year.unknown': 'Unknown date',
    'meta.started': 'Started',
    'meta.updated': 'Updated',
    'footer.built': 'Built with Astro - auto-generated from GitHub & npm.',
    'lang.switch': 'Français',
    'lang.switch.aria': 'Passer en français',
    'a11y.skip': 'Skip to content',
    'a11y.nav': 'Language selector',
    'a11y.toolbar': 'Search and view',
    'a11y.newtab': '(opens in a new tab)',
  },
} as const;

export type UIKey = keyof (typeof ui)['fr'];

export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/** Path to the same page in the other locale (FR at "/", EN at "/en/"). */
export function otherLangPath(lang: Lang): string {
  return lang === 'fr' ? '/en/' : '/';
}

/** Localized "month year" from an ISO date (e.g. "janv. 2022" / "Jan 2022"). */
export function formatMonthYear(iso: string, lang: Lang): string {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(iso));
}
