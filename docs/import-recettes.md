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
