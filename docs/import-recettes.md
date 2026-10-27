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

Score moyen de l'import actuel : **46 %** sur 4 cas (`expected.json` encore au statut de brouillon).
Détail champ par champ : [`RESULTS-legacy.md`](../tests/import-fixtures/RESULTS-legacy.md).

### Diagnostic

- **Confirmé** : quantité, unité et nom mélangés. Sur les deux pages à JSON-LD, le nom de l'ingrédient n'est jamais isolé (qté et unités : 38 % et 7 %).
- **Confirmé** : aucune structuration quand la page n'a pas de données schema.org (01 et 03 : ni ingrédient ni étape).
- **Confirmé** : le résumé promotionnel arrive dans la case affichée comme astuce (04 : « Notée 5/5 par 4 membres Marmiton »).
- **Non reproduit** : « tout le contenu dans la description ». Le code n'y verse jamais le texte de la page, et aucun des 4 cas ne le fait. Il faut l'URL qui l'a provoqué pour l'ajouter au jeu de test.
- **Non reproduit** : « toutes les étapes dans l'étape 1 ». Même remarque.
- **Infirmé** : blocages d'Encuisine et de Marmiton. Les deux pages répondent 200 au `fetch` du serveur avec l'User-Agent `KeskonBouf-Bot/1.0`. Le refus venait de l'outil de lecture utilisé pour l'observation, pas d'un blocage de l'import. À revérifier depuis le serveur de test (adresse IP différente).
- `robots.txt` : aucun des quatre sites n'interdit ces pages aux robots génériques.

### Reste à faire pour clore le jour 1

- [ ] Relire et valider les 4 `expected.json` (champ `statut` → `"valide"`).
- [ ] Ajouter 10 à 15 URLs, dont celles qui ont produit « tout dans la description » et « toutes les étapes dans l'étape 1 ».
