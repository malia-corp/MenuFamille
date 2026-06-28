# CLAUDE.md — MenuFamille

Guide de travail pour les sessions de développement pair-programmeur (Claude Code).

---

## Convention de commit

```
feat(ID-story): description courte en français
fix(ID-story): description
chore: description (setup, config, outillage sans impact fonctionnel)
```

Les IDs de story (ex. `MF-001`) seront fournis au Sprint 1. En Sprint 0, utiliser `chore:` ou `feat(sprint0):`.

Exemple : `feat(MF-012): ajouter la politique RLS sur recipes`

---

## Garde-fou de périmètre — règle absolue

Ce projet couvre le MVP défini dans la section 5 du CDC (`docs/MenuFamille_CDC_v3.docx`) :

- Configuration des repas
- Génération de menu
- Carnet de recettes
- Cercle familial
- Sondage famille
- Notifications
- Feedback post-repas
- Liste de courses
- Garde-manger
- Mode hors connexion

**Si une fonctionnalité utile mais absente de cette liste émerge pendant le développement :**
1. Ne pas l'implémenter
2. Ajouter une ligne dans `BACKLOG_PHASE2.md` à la racine
3. Continuer la tâche en cours

**Si un choix d'architecture impose un compromis de périmètre :** s'arrêter et poser la question avant de trancher seul.

---

## Décisions de cadrage tranchées

Voir [`docs/decisions.md`](docs/decisions.md) pour le détail. Résumé :

1. Dialogue doublon recette : 3 choix (utiliser / variante / indépendante)
2. Visibilité recette : `private` / `circle` / `community`, défaut `private`
3. Feedback post-repas : 3 emojis (😊/😐/😕), pas des étoiles
4. Import recette : `source_url` + table `recipe_imports`, pas de scan IA
5. Notifications : couvrent les 4 types de repas

---

## Format d'ouverture de session

À chaque nouvelle session de travail, fournir à Claude :

```
## Session du [date]

**Story** : [ID-story] — [intitulé de la story]

**Critère d'acceptation** :
- [ ] ...
- [ ] ...

**Modèle de données concerné** :
[Coller ici l'extrait pertinent du schéma SQL ou du CDC]

**Contexte supplémentaire** :
[Décisions récentes, blocages, contraintes spécifiques]
```

---

## Commandes utiles

```bash
# Développement local
npm run dev          # Serveur Next.js sur localhost:3000
npm run lint         # ESLint
npm run build        # Build de production

# Supabase
supabase db push     # Appliquer les migrations sur le projet lié
supabase gen types typescript --linked > lib/supabase/database.types.ts

# Tests
# (à définir au Sprint 1)
```

---

## Structure de migration

Les migrations sont découpées par domaine fonctionnel dans `supabase/migrations/` :

- `*_a_users_circles.sql` — profils, cercles familiaux
- `*_b_recipes_contribution.sql` — recettes, catégories
- `*_c_config_planning.sql` — configuration repas, planification
- `*_d_survey_feedback.sql` — sondage, feedback, notifications
- `*_e_shopping_pantry.sql` — courses, garde-manger

Ne jamais créer une migration monolithique.
