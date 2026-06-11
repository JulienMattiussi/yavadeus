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
    'cat.jeux.desc': 'Des jeux et casse-tête.',
    'cat.outils.desc': 'Des outils qui rendent service (ou presque).',
    'cat.delires.desc': 'Des idées qui ne servent à rien, et fières de l’être.',
    'link.github': 'code',
    'link.live': 'live',
    'link.npm': 'npm',
    'badge.ai': 'IA',
    'badge.ai.title': 'Construit avec un agent IA',
    'count.projects': 'projets',
    'meta.started': 'Démarré',
    'meta.updated': 'Dernière action',
    'footer.built': 'Construit avec Astro - auto-généré depuis GitHub & npm.',
    'lang.switch': 'English',
  },
  en: {
    'site.title': 'yavadeus',
    'site.tagline': 'My projects, all in one place.',
    'site.intro': 'A central hub for the things I build: games, tools, and a few oddities.',
    'cat.jeux': 'games',
    'cat.outils': 'tools',
    'cat.delires': 'oddities',
    'cat.jeux.desc': 'Games and puzzles.',
    'cat.outils.desc': 'Tools that help (more or less).',
    'cat.delires.desc': 'Useless ideas, proudly so.',
    'link.github': 'code',
    'link.live': 'live',
    'link.npm': 'npm',
    'badge.ai': 'AI',
    'badge.ai.title': 'Built with an AI agent',
    'count.projects': 'projects',
    'meta.started': 'Started',
    'meta.updated': 'Last activity',
    'footer.built': 'Built with Astro - auto-generated from GitHub & npm.',
    'lang.switch': 'Français',
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
