# MenuFamille — Décisions de cadrage Sprint 0

Ces 5 décisions sont tranchées et s'appliquent à l'ensemble du projet sans redemander validation.

---

## 1. Dialogue de doublon de recette

**Décision** : implémenter le dialogue à 3 choix — (a) utiliser la recette existante, (b) créer une variante liée via `parent_recipe_id` + `variant_label`, (c) créer une recette indépendante.

**Pourquoi** : le CDC v3 prévoit la traçabilité des variantes culinaires (ex. "sans piment", "version végétarienne") ; la version à 2 choix perdrait cette information structurelle.

---

## 2. Visibilité des recettes

**Décision** : le champ `visibility` existe dès le schéma initial avec trois valeurs (`private` / `circle` / `community`) et la valeur par défaut `private`.

**Pourquoi** : permet un contrôle de partage progressif dès la création ; la valeur par défaut `private` protège les recettes personnelles sans action supplémentaire de l'utilisatrice.

---

## 3. Feedback post-repas

**Décision** : le système de feedback utilise 3 réactions emoji (😊 / 😐 / 😕), pas des étoiles.

**Pourquoi** : les emojis sont plus expressifs et culturellement adaptés au contexte mobile africain ; ils s'alignent avec le ton de l'application et permettent une saisie ultra-rapide sur petit écran.

---

## 4. Import de recette

**Décision** : prévoir le champ `source_url` sur la table `recipes` et la table `recipe_imports` pour l'import par URL (scraping). Le scan photo par IA est hors scope MVP — aucune table, aucune dépendance pour cette fonctionnalité.

**Pourquoi** : l'import URL est listé dans le CDC v3 comme fonctionnalité MVP ; le scan IA représente une complexité d'infrastructure disproportionnée pour ce sprint et sera traité en Phase 2.

---

## 5. Notifications

**Décision** : la table `notification_prefs` couvre les 4 types de repas (petit-déjeuner, déjeuner, goûter, dîner), pas seulement déjeuner/dîner.

**Pourquoi** : le CDC v3 prévoit que les utilisatrices peuvent activer n'importe quelle combinaison de types de repas ; restreindre les notifications à 2 types créerait une incohérence fonctionnelle dès le Jour 1.
