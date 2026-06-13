# Contenu à compléter

Inventaire des données du site et de leur **source**. Pipeline en 3 étapes :
**fetch** (`make fetch` récupère GitHub/npm dans le cache) → **curate**
(`make curate` : catégorie, WIP, ignore, prune) → **build** (rend hors-ligne).
Tout ce qui n'est ni **fetch** ni **curate** est **manuel**.

## Référence : qui remplit quoi

| Donnée              | Source | Détail                                                                     |
| ------------------- | ------ | -------------------------------------------------------------------------- |
| titre               | fetch  | nom du repo embelli (override `title` possible)                            |
| sous-titre          | fetch  | description GitHub, **auto-traduite FR/EN** (override `subtitle {fr,en}`)  |
| lien GitHub         | fetch  | URL du repo                                                                |
| lien live           | fetch  | `homepage` GitHub, sinon GitHub Pages (override `live`)                    |
| technos             | fetch  | **frameworks (package.json)** + langages GitHub (override `tech`)          |
| étoiles             | fetch  | GitHub                                                                     |
| dates               | fetch  | 1er commit (démarrage) + dernier push (mise à jour)                        |
| favicon / icône     | fetch  | favicon du site live, sinon icône applicative du repo (override `favicon`) |
| lien téléchargement | fetch  | dernière release avec binaires (override `download`)                       |
| badge IA            | fetch  | présence `AGENTS.md`/`CLAUDE.md`/`.claude` (override `ai`)                 |
| icône Discord       | fetch  | le README mentionne un « bot Discord »                                     |
| lien npm            | fetch  | auto si `package.json` publié sur npm & maintenu par toi (override `npm`)  |
| **catégorie**       | curate | `make curate` (requis pour afficher un repo)                               |
| **WIP**             | curate | `make curate`                                                              |
| ignoré              | curate | `make curate` (liste `ignored`)                                            |
| vignette            | manuel | `public/thumbnails/<repo>.png`                                             |
| image de partage    | manuel | `public/og.png` (1200×630, OG/Twitter)                                     |
| textes du site      | manuel | i18n FR/EN (`src/i18n/ui.ts`)                                              |
| config / assets     | manuel | `.env` (`GITHUB_USER`, `NPM_USER`, `SITE_URL`), favicon "y", couleurs      |

---

## État

L'essentiel est **automatique et validé**. Tout le catalogue (35 projets) tourne
sans aucun override : titres, sous-titres bilingues traduits, technos +
frameworks, favicons, liens, dates, badges IA, icônes Discord. Audit des données
auto effectué (liens de prod, favicons, releases, npm, traductions) : RAS notable.

Fait : favicon "y", palette du thème, textes du site (tagline, intro, rubriques,
libellés), `SITE_URL` (`yavadeus.vercel.app`), balises OG/Twitter + canonical +
hreflang, image de partage `public/og.png`, `robots.txt` + `sitemap.xml`.

## Reste à faire

- [ ] **Vignettes** d'aperçu (`public/thumbnails/<repo>.png`) - aucune pour
      l'instant. Seul vrai manque ; optionnel (les cartes sont propres sans).
- [ ] **Déploiement** sur Vercel.

> Détail : le sous-titre auto-traduit peut rester imparfait quand le moteur ne
> reconnaît pas un terme (ex. « lorrain » rendu « Lorraine »). On corrige en
> reformulant la description GitHub (puis `make fetch`), ou via un override
> `subtitle`. Idem si une description trop courte n'est pas détectée comme
> française et n'est pas traduite.
