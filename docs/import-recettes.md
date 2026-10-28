# Import de recettes — suivi du chantier v2

Journal du chantier décrit dans le prompt « Import de recettes v2 (lien + texte collé) ».
Jeu de test : [`tests/import-fixtures/`](../tests/import-fixtures/README.md).

## Jour 1 — Audit et mesure (27 octobre 2026)

### Comment l'import actuel remplit le formulaire

1. `POST /api/recipes/import-url` télécharge la page (`fetch`, 8 s, sans limite de taille ni contrôle du type de contenu, sans protection SSRF).
2. Le parseur (extrait tel quel dans `lib/import/legacy.ts`) ne fonctionne qu'avec des expressions régulières : **pas de `cheerio`**, contrairement à l'hypothèse du prompt.
3. Il essaie, dans l'ordre : JSON-LD `Recipe`, microdonnées, puis une heuristique sur le texte brut (lignes « - … » = ingrédients, « 1. … » = étapes).
4. `description` reçoit la description du JSON-LD, ou à défaut `og:description` : le résumé promotionnel du site.
5. Les ingrédients sortent en **chaînes entières** (« 500 g de navets », « Semoule de blé dure fine: 500g »).
6. Les deux formulaires (web `recipes/add/page.tsx` et mobile `mobile/app/recipes/add.tsx`) mettent chaque chaîne entière dans `name`, avec `quantity` et `unit` vides.
7. Une `HowToSection`, ou un `recipeInstructions` en chaîne unique, ne donne aucune étape.
8. `recipeYield` en texte (« Serves 5 ») devient 4 portions sans avertissement ; les durées en jours sont ignorées.
9. Le formulaire n'a qu'un champ `description`, affiché comme l'astuce de la recette (« Le mot de la cuisine ») : **le texte promotionnel du site devient l'astuce**.
10. `recipe_imports` n'est écrit qu'à la sauvegarde (`recipe_id` obligatoire) : les imports ratés ne laissent aucune trace.

### Mesure

| Cas | HTTP | Données de la page | Extension | Score actuel |
|---|---|---|---|---|
| 01 ckremenbon (article de blog) | 200 | JSON-LD sans `Recipe` (BlogPosting, FAQPage) | — | **9 %** |
| 02 africa-cuisine (Dambou) | 200 | JSON-LD `Recipe` (sans temps, ingrédients « nom: quantité ») | — | **85 %** |
| 03 encuisine (Poulet yassa) | 200 | Aucune donnée structurée (Next.js) | — | **23 %** |
| 04 marmiton (Pot-au-feu) | 200 | JSON-LD `Recipe` complet (`HowToStep`) | — | **69 %** |
| 05 emilehenry (Légumes farcis) | 200 | Aucune donnée de recette ; HTML propre au site | — | **27 %** |
| 06 emilehenry (Ratatouille) | 200 | Idem 05, étapes non numérotées | — | **32 %** |
| 07 voyagezencuisinant (Crousty) | 200 | Aucune donnée de recette (WordPress + Elementor) | — | **18 %** |
| 08 meilleurduchef (Charlotte) | 200 | JSON-LD `Recipe` : 106 micro-étapes, description = préparation | — | **64 %** |
| 09 regal (Œuf mollet) | 200 | JSON-LD `Recipe` vide (ni ingrédients ni étapes) | — | **9 %** |

Score moyen de l'import actuel : **36 %** sur 9 cas (`expected.json` encore au statut de brouillon).
Sur 9 pages, 5 n'ont aucune donnée de recette exploitable : le repli (HTML propre au site ou LLM) concerne plus de la moitié des cas.
Détail champ par champ : [`RESULTS-legacy.md`](../tests/import-fixtures/RESULTS-legacy.md).

### Diagnostic

- **Confirmé** : quantité, unité et nom mélangés. Sur les deux pages à JSON-LD, le nom de l'ingrédient n'est jamais isolé (qté et unités : 38 % et 7 %).
- **Confirmé** : aucune structuration quand la page n'a pas de données schema.org (01 et 03 : ni ingrédient ni étape).
- **Confirmé** : le résumé promotionnel arrive dans la case affichée comme astuce (04 : « Notée 5/5 par 4 membres Marmiton »).
- **Confirmé (cas 07 et 08)** : des étapes arrivent dans la description. Ce n'est pas le parseur qui y verse la page : c'est le site lui-même qui met le début de sa préparation dans `og:description` (07) ou dans la `description` du JSON-LD (08). La description d'une page n'est donc jamais fiable telle quelle.
- **Non reproduit** : « toutes les étapes dans l'étape 1 ». Il faut l'URL qui l'a provoqué.
- **Nouveau (09)** : un JSON-LD `Recipe` peut être vide ou mal formé (durées « 30 », « P50M »). L'actuel ne le lit même pas (sa regex exige `type="application/ld+json"` en guillemets doubles), d'où un nom pris dans `og:title` avec son suffixe SEO. Le nouvel extracteur devra compléter un JSON-LD incomplet avec le HTML au lieu de s'arrêter au premier « succès ».
- **Nouveau (08)** : des ingrédients reviennent légitimement (une recette en cinq sous-recettes) ; le dédoublonnage ne doit retirer qu'une liste affichée deux fois (02, 09), jamais un ingrédient répété.
- **Nouveau (07, 09)** : ingrédients en groupes (« Pour la vinaigrette », « Pour la panure »), que le schéma actuel ne sait pas stocker.
- **Infirmé** : blocages d'Encuisine et de Marmiton. Les deux pages répondent 200 au `fetch` du serveur avec l'User-Agent `KeskonBouf-Bot/1.0`. Le refus venait de l'outil de lecture utilisé pour l'observation, pas d'un blocage de l'import. À revérifier depuis le serveur de test (adresse IP différente).
- `robots.txt` : aucun des quatre sites n'interdit ces pages aux robots génériques.

### Reste à faire pour clore le jour 1

- [ ] Relire et valider les 9 `expected.json` (champ `statut` → `"valide"`).
- [ ] Trancher : groupes d'ingrédients (08, 07, 09) et micro-étapes de 08 (regrouper par sous-recette ou garder 106 étapes).
- [ ] Ajouter quelques URLs, dont celle qui a produit « toutes les étapes dans l'étape 1 », et des blogs béninois / ouest-africains.

### Portions, temps et difficulté (28 octobre 2026)

| Cas | Portions | Préparation / cuisson | Difficulté | Actuel (P / prép. / cuis. / diff.) |
|---|---|---|---|---|
| 01 | « 🍽 Portions · 4 personnes » | « ⏱ Préparation · 15 min », « 🔥 Cuisson · 35 min » | « Très facile » | rien |
| 02 | JSON-LD `"5"` ; page « Serves 5 » | absent | « Easy » | 5 / — / — / — |
| 03 | « Servings · 2 » (page en anglais) | « Prep time · 30 min », « Cook time · 40 min » | « Medium » | rien |
| 04 | JSON-LD `"6 personnes"` | `PT30M`, `PT2H` (+ « Repos » sur la page) | « Facile » (suivi de « Moyen » = coût) | 6 / 30 / 120 / — |
| 05 | « Pour 6 personnes » | « Préparation : 35 min », « Cuisson : 1h » | absent | rien |
| 06 | « Pour 6 personnes » | « Préparation : 25 min », « Cuisson : 45 min » | absent | rien |
| 07 | absent | « 10 minutes de préparation - 15 minutes de cuisson » (une seule ligne) | « Facile » | rien |
| 08 | JSON-LD `"8 personnes"` ; « Pour : 8 personnes » | total seulement : `PT2H`, « 2 heures (+ 2 heures au frais) » | barre à 66 %, sans texte | 8 / — / — / — |
| 09 | JSON-LD `"4"` ; « 4 personnes » | JSON-LD mal formé (`"30"`, `"20"`, `P50M`) ; page « Préparation : 30 min » | « Facile » (suivi de « Bon marché » = coût) | rien |

Constats :

- **Difficulté : jamais récupérée** (0/9). schema.org n'a pas de champ standard pour la difficulté : elle n'est dans aucun JSON-LD, seulement dans la page. L'import actuel ne la cherche pas.
- **Portions : 3/8 récupérées**, uniquement quand le JSON-LD est lu. Formats rencontrés : nombre seul, « N personnes », « Pour N personnes », « Pour : N personnes », « Serves N », « Servings N ». Défaut de l'actuel : `recipeYield` absent ou illisible devient **4 portions sans avertissement** (`|| 4` dans `mapLdToPartial`), une valeur inventée.
- **Temps : 1 page sur 7 récupérée** (04). Formats : ISO 8601 (`PT2H30M`), ISO mal formé (`"30"`, `P50M` sans `T`), « 15 min », « 1h », « 2h30 », « 1 hr 10 min », « 2 heures », et deux temps sur une même ligne (07).
- **Pièges** :
  - le **coût** est affiché juste après la difficulté, parfois sans libellé (04 « Facile · Moyen », 09 « Facile · Bon marché ») : « Moyen » n'est pas une difficulté ;
  - les menus du site contiennent « Recettes faciles » (01, 04, 09) : ne chercher que dans le bloc de la recette, jamais dans toute la page ;
  - « La cuisson » est aussi un titre d'étape (03) et « feu moyen » un texte d'étape : un libellé doit être suivi d'une durée pour compter ;
  - certaines pages ne donnent que la durée totale (08) : ne pas l'inventer en préparation ou en cuisson ;
  - temps de repos ou de marinade (04 « Repos », 08 « + 2 heures au frais », 03 « 1h15 » d'étape) : aucune colonne pour eux aujourd'hui.

Règles proposées pour le jour 2 (`lib/import/normalize.ts`) :

1. **Portions** : premier entier d'un `recipeYield` ou d'un libellé (personnes, portions, parts, serves, servings, pour N). Fourchette « 4 à 6 » → borne basse et avertissement. Rendement en pièces (« 12 biscuits », « 1 moule ») → `null` et texte gardé dans les notes. Jamais de valeur par défaut.
2. **Temps** : analyseur tolérant (ISO avec jours et sans `T`, nombre seul = minutes, h / hr / heure(s) / min / minute(s), « 2h30 »). JSON-LD d'abord, la page complète ce qui manque. Durée totale seule → préparation et cuisson `null` et avertissement « durée totale : 2 h ».
3. **Difficulté** : seulement à côté d'un libellé « Difficulté / Niveau / Difficulty », ou dans l'en-tête de la recette. Correspondance :

   | Texte de la page | Valeur |
   |---|---|
   | très facile, facile, easy, simple, débutant | `facile` |
   | moyen, moyenne, intermédiaire, medium, intermediate | `moyen` |
   | difficile, difficult, hard, expert, confirmé, avancé | `difficile` |

   « Bon marché », « Moyen » placés après la difficulté = coût, ignorés. Barres ou étoiles sans texte (08) : règle propre au site, sinon `null`.
4. Un champ non trouvé reste `null` et devient un champ « à vérifier » sur l'écran de relecture.

### Décisions prises (28 octobre 2026)

- **Temps de repos** (marinade, frigo, pousse) : ajouté au temps de **préparation**, sans nouvelle colonne. L'import le garde aussi à part dans sa sortie (`rest_min`, conservé dans `recipe_imports`) pour les futurs rappels « à préparer la veille » (backlog). L'écran de relecture affiche « dont N de repos » à côté du champ.
- **Durée totale seule** (cas 08) : préparation et cuisson laissées vides, avertissement « La page indique N au total, à répartir » sur l'écran de relecture. Le repos éventuel s'ajoute à la préparation saisie.
- **Pas de colonne « durée totale »** : l'app la calcule déjà (préparation + cuisson) pour le filtre « Moins de 30 min » et le tri « Plus rapides », qui comptent donc le repos.
- **Fourchette de portions** (« 4 à 6 ») : borne basse, champ surligné « La page indique 4 à 6 personnes ».
- **Portions introuvables ou en pièces** : champ vide, « à saisir » sur la relecture, enregistrement bloqué tant qu'il est vide (`servings` est obligatoire en base). Plus jamais de 4 par défaut.
