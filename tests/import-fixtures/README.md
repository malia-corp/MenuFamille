# Jeu de test de l'import de recettes

Un dossier par cas : `NN-site-plat/`.

| Fichier | Rôle | Dans Git |
|---|---|---|
| `url.txt` | Adresse de la page | oui |
| `page.html` | HTML brut téléchargé (`npm run import:fetch`) | **non** : contenu protégé des sites tiers |
| `fetch.json` | Ce qui s'est passé au téléchargement (code HTTP, type, taille, délai) | oui |
| `expected.json` | Résultat attendu, rédigé ou validé à la main | oui |
| `out-<version>.json` | Sortie de l'import pour une version donnée (`npm run import:eval`) | oui |

## Ajouter un cas

1. Créer le dossier et `url.txt`.
2. `npm run import:fetch -- NN`.
3. Rédiger `expected.json` (format ci-dessous), puis `npm run import:eval`.

## Format de `expected.json`

```jsonc
{
  "statut": "brouillon",            // "brouillon" (proposé par Claude) ou "valide" (relu par la développeuse)
  "page_type": "single_recipe",     // single_recipe | multi_recipe_roundup | not_a_recipe | blocked
  "name": "Poulet yassa",
  "servings": 4,                    // null si la page ne le dit pas
  "prep_min": 30,
  "cook_min": 40,
  "difficulty": "moyen",            // facile | moyen | difficile | null
  "ingredients": [
    { "quantity": 4, "unit": "gousse", "name": "ail", "optional": false }
  ],
  "steps": [
    { "title": "Marinade du poulet", "starts_with": "Une fois le poulet nettoyé" }
  ],
  "tip": null,                      // seulement un conseil explicite de l'auteur
  "notes": "Remarques libres sur les choix faits dans ce fichier"
}
```

- `quantity` : nombre (fractions converties : `1/2` → `0.5`), `null` si « au goût » ou absent.
- `unit` : unité canonique, au singulier, `null` si l'ingrédient se compte (« 2 oignons »).
- `name` : sans quantité ni unité ni mention « optionnel ». La comparaison ignore la casse et les accents.
- `starts_with` : début du texte de l'étape (une trentaine de caractères suffit). Le texte entier n'est pas comparé, il varie trop d'un site à l'autre.

### Unités canoniques proposées (à valider)

`g`, `kg`, `ml`, `cl`, `l`, `c. à soupe`, `c. à café`, `pincée`, `gousse`, `branche`, `botte`, `tranche`, `morceau`, `poignée`, `feuille`, `verre`, `sachet`, `boîte`, `cube`, `cm`.

## Notation (`npm run import:eval`)

Chaque champ est noté de 0 à 1, le score d'un cas est la moyenne :
nom, portions, temps de préparation, temps de cuisson, nombre d'ingrédients,
quantités et unités, nombre d'étapes, astuce, et l'absence de fuite dans
`description` (aucun ingrédient ni étape attendu ne doit s'y retrouver).
