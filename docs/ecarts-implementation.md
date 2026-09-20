# MenuFamille — Écarts d'implémentation vs. plan

Ce fichier trace les cas où le code réel diverge de ce qu'un prompt de sprint ou une lecture du CDC/`decisions.md` laisserait attendre — pas des bugs, des décisions d'implémentation prises en cours de route et jamais documentées ailleurs. Objectif : que les prompts des sprints suivants ne cherchent pas une structure qui n'a jamais existé.

---

## 1. Détection de doublon de recette — pas d'endpoint dédié

**Attendu (implicite dans les prompts/CDC)** : un endpoint séparé, ex. `POST /api/recipes/check-duplicate`.

**Réel, depuis Sprint 2** (commit `bcc5c4b`, Jour 2) : la détection est intégrée directement dans `POST /api/recipes` (`app/api/recipes/route.ts:56-69`).
- Comparaison sur `name_fingerprint` (nom normalisé : minuscules, sans accents, espaces réduits)
- Scope de comparaison : recettes du compte courant + recettes `visibility=community` uniquement (jamais les recettes privées ou de cercle d'un autre compte)
- Si correspondance trouvée et ni `force` ni `parent_recipe_id` fournis → réponse `409 { conflict: true, existing: { id, name } }`
- Le client déclenche alors le dialogue à 3 choix (décision #1, `docs/decisions.md`) :
  - **Utiliser l'existante** → le client abandonne la création, réutilise `existing.id`
  - **Créer une variante** → renvoyer la requête avec `parent_recipe_id` (bypass le check)
  - **Créer indépendante** → renvoyer la requête avec `force: true` (bypass le check)

**Pourquoi ça reste correct** : le comportement respecte la décision de cadrage #1 ; c'est un écart de forme (pas d'endpoint séparé), pas de fond.

**Pour les prompts futurs** : cibler `POST /api/recipes` avec le payload de création complet pour tout test lié aux doublons — ne pas chercher `/check-duplicate`.

---

<!-- Ajouter les prochains écarts constatés sous cette ligne, même format : Attendu / Réel / Pourquoi ça reste correct (ou pas) / Pour les prompts futurs -->
