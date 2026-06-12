# Contenu à compléter

Inventaire des données du site et de leur **source**. Pipeline en 3 étapes :
**fetch** (`make fetch` récupère GitHub/npm dans le cache) → **curate**
(`make curate` : catégorie, WIP, ignore, prune) → **build** (rend hors-ligne).
Tout ce qui n'est ni **fetch** ni **curate** est **manuel** : c'est le travail
restant.

> Sauvegarde des données curées d'avant la remise à zéro :
> [`doc/projects-curated.ts.bak`](projects-curated.ts.bak) (sous-titres bilingues,
> catégories, overrides des 13 premiers projets). Pour restaurer : copier son
> contenu dans `src/data/projects.ts`.

## Référence : qui remplit quoi

| Donnée              | Source | Détail                                                                     |
| ------------------- | ------ | -------------------------------------------------------------------------- |
| titre               | fetch  | nom du repo embelli (override `title` possible)                            |
| lien GitHub         | fetch  | URL du repo                                                                |
| lien live           | fetch  | champ `homepage` GitHub (override `live`)                                  |
| technos             | fetch  | langages GitHub top 3 (override `tech`)                                    |
| étoiles             | fetch  | GitHub                                                                     |
| date de démarrage   | fetch  | 1er commit                                                                 |
| date de mise à jour | fetch  | dernier push                                                               |
| favicon / icône     | fetch  | favicon du site live, sinon icône applicative du repo (override `favicon`) |
| lien téléchargement | fetch  | dernière release avec binaires (override `download`)                       |
| badge IA            | fetch  | présence `AGENTS.md`/`CLAUDE.md`/`.claude` (override `ai`)                 |
| lien npm            | manuel | nom du package en override `npm` (le lien est ensuite dérivé)              |
| **catégorie**       | curate | `make curate`                                                              |
| **WIP**             | curate | `make curate`                                                              |
| ignoré              | curate | `make curate` (liste `ignored`)                                            |
| **sous-titre**      | manuel | repli = description GitHub (monolingue) ; bilingue à écrire                |
| **vignette**        | manuel | `public/thumbnails/<repo>.png`                                             |
| **featured**        | manuel | mise en avant                                                              |
| **order**           | manuel | ordre fin                                                                  |
| textes du site      | manuel | i18n FR/EN (`src/i18n/ui.ts`)                                              |
| config / assets     | manuel | `.env` (`GITHUB_USER`, `SITE_URL`), favicon "y", couleurs                  |

---

## A. Manuel pur - aucun filet (à produire)

- [ ] **Sous-titres bilingues** par projet (surtout l'EN ; le FR repli = desc GitHub). _Le plus gros poste._
- [ ] **Vignettes** d'aperçu (`public/thumbnails/<repo>.png`) - rien pour l'instant.
- [ ] **`npm`** : nom du package à lier, pour chaque projet publié.
- [ ] **`featured`** : choix éditorial des projets à mettre en avant.
- [ ] **`order`** : ordre fin (optionnel).
- [ ] **`title`** : override seulement si le nom embelli ne convient pas.

## B. Overrides à auditer projet par projet (on commence par là)

Champs déjà remplis automatiquement : il s'agit de **vérifier** et corriger au cas
par cas. Voir la matrice de suivi plus bas.

- [x] Auditer les **liens live** - OK, aucune exception (0 "faux live" sur 40 repos).
- [x] Auditer les **favicons / icônes** - OK (Vite par défaut sur combien-mieux-que-un et icône web-extension sur fast-emoji confirmés comme les bons).
- [x] Auditer les **liens de téléchargement** - OK (seul deduplicateur, release v1.3.0).
- [x] Auditer les **badges IA** - OK (détection `AGENTS.md`/`CLAUDE.md`/`.claude` juste).
- [ ] **Technos** - corrects en langages bruts ; à enrichir au cas par cas si on veut afficher un framework (React, Astro...). Optionnel.

> Lot B validé pour les 13 projets actuels (juin 2026). À refaire pour les repos ajoutés via la CLI.

## C. Contenu & config au niveau du site

- [ ] **`site.tagline`** et **`site.intro`** (FR/EN)
- [ ] **Noms + descriptions des 4 rubriques** (`cat.*`, `cat.*.desc`)
- [ ] **Libellés** : footer, switch langue, recherche, vues, badges, a11y, gate délires
- [ ] **URL du site** dans `.env` (`SITE_URL`, actuellement `yavadeus.dev` - à confirmer)
- [x] Favicon "y" (fait)
- [x] Palette de couleurs du thème (fait)

---

## Matrice de suivi par projet

Légende : `auto` = on garde l'enrichissement automatique (à vérifier) · `✏️` =
override manuel posé · `✓` = fait/validé · `-` = sans objet · `TODO` = à faire.

| Projet                       | Rubrique | Live | Tech | Favicon            | Téléch. | IA   | Sous-titre     | Vignette | Featured |
| ---------------------------- | -------- | ---- | ---- | ------------------ | ------- | ---- | -------------- | -------- | -------- |
| universal-picross            | jeux     | auto | auto | auto               | -       | auto | fr+en          | TODO     | ✓        |
| calendar-solver              | jeux     | auto | auto | auto               | -       | auto | fr+en          | TODO     | -        |
| ptitjeux                     | jeux     | auto | auto | auto               | -       | auto | fr+en          | TODO     | -        |
| bingo-builder                | jeux     | auto | auto | auto               | -       | auto | fr+en          | TODO     | -        |
| deduplicateur                | outils   | auto | auto | auto (icône Tauri) | auto    | auto | fr+en          | TODO     | ✓        |
| fast-emoji                   | outils   | auto | ✏️   | auto               | -       | auto | fr+en          | TODO     | -        |
| lorrainjs                    | outils   | auto | auto | auto               | -       | auto | fr+en (npm ✏️) | TODO     | -        |
| veilleur                     | outils   | auto | auto | auto               | -       | auto | fr+en          | TODO     | -        |
| legoroscope                  | délires  | auto | ✏️   | auto               | -       | auto | fr+en          | TODO     | ✓        |
| tripote-visor                | délires  | auto | auto | auto               | -       | auto | fr+en          | TODO     | -        |
| combien-mieux-que-un         | délires  | auto | auto | auto               | -       | auto | fr+en          | TODO     | -        |
| balkanoche-prison-calculator | délires  | auto | auto | auto               | -       | auto | fr+en          | TODO     | -        |
| are-you-vulcain              | délires  | auto | auto | auto               | -       | auto | fr+en          | TODO     | -        |

> Les ~27 repos restants apparaîtront ici une fois catégorisés via `make curate`.

## Ordre de travail prévu

1. **B** - audit des données auto-enrichies projet par projet (les plus abouties).
2. **A** - sous-titres bilingues, puis vignettes, featured.
3. **C** - textes du site et config finale.
4. Déploiement (en dernier).
