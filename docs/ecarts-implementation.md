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
Ce fichier trace les cas où le code réel diverge de ce qu'un prompt de sprint ou une lecture du CDC/`decisions.md` laisserait attendre, ou des lacunes connues et volontairement reportées — pour que les prompts des sprints suivants ne redécouvrent pas ce qui est déjà su.

---

## 1. Pas d'UI pour switcher entre plusieurs cercles familiaux

**Constat** : `app/(app)/circle/page.tsx` n'affiche jamais que `circles[0]` (commentaire dans le code : "MVP : un seul cercle à la fois"). Dès qu'une utilisatrice appartient à 2+ cercles (ex. elle en crée un second), le premier devient invisible dans cette page — pas de sélecteur, pas d'onglets, rien pour y revenir depuis l'UI.

**Ce qui fonctionne déjà malgré ça** (vérifié, aucun changement backend nécessaire pour une future UI de sélection) :
- `GET /api/circles` renvoie **tous** les cercles de l'utilisatrice, pas seulement le premier — la limitation est uniquement dans le rendu de `circle/page.tsx`.
- `GET/POST /api/circles/:id/members/:userId/prefs` et `DELETE .../prefs/:prefId` (préférences alimentaires, ajoutées pour l'exclusion d'allergènes) acceptent n'importe quel `:id` de cercle en paramètre, pas seulement celui affiché à l'écran.
- La génération automatique (`generate/route.ts`) et le badge d'allergènes (`GET /api/meal-plans`) agrègent déjà les allergènes stricts de **tous** les cercles de l'utilisatrice qui planifie, pas d'un cercle unique — décision actée précisément parce qu'il n'y a pas de notion de "cercle actif" (`meal_plans.circle_id` n'est d'ailleurs jamais renseigné non plus, même constat).

**Décision** : reporté à un futur "sprint polish" (UI de sélection de cercle). Une fois cette UI construite, elle n'aura qu'à choisir quel cercle afficher/cibler — aucune des API listées ci-dessus n'a besoin d'être modifiée pour ça.

**Mise à jour (sprint 4, 3 octobre 2026) — résolu côté affichage** : colonne `users.active_circle_id` (migration `u_users_active_circle`), choisie via `PUT /api/circles/active` et le sélecteur avec recherche de `/circle` (`components/circle/circle-switcher.tsx`). Résolution unique dans `lib/utils/active-circle.ts` (cercle choisi s'il en est toujours membre, sinon le premier rejoint), utilisée par le layout (en-tête, rôle, navigation), `GET /api/circles` (`active_circle_id`), l'accueil et le profil. Créer ou rejoindre un cercle le rend actif. **Inchangé** : la génération et le badge d'allergènes agrègent toujours tous les cercles, et `meal_plans.circle_id` n'est toujours pas renseigné.

---

## 2. Liste de courses — schéma présent en base, aucune route ni UI

**Constat** : les tables `shopping_lists`/`shopping_list_items` existent depuis la migration `20260701090005_e_shopping_pantry.sql` (statut `active`/`completed`/`archived`, items rattachés à `pantry_categories`), mais **aucune route `/api/shopping*` et aucune page `/shopping` n'existent** — pas de génération automatique depuis un plan de menu, pas de CRUD. Trouvé en construisant l'écran Accueil (prompt de maquette KeskonBouf, widget "Courses & Marché" côté desktop), omis de cet écran pour cette raison.

**Décision** : fonctionnalité à construire dans son propre sprint ("Liste de courses" fait partie du périmètre CDC — ce n'est pas un report hors-scope, juste une feature pas encore attaquée). Le widget desktop correspondant pourra être ajouté à `app/(app)/page.tsx` une fois l'API disponible, sans toucher au reste de l'écran.

---

## 3. Upload de photo de recette — aucun traitement serveur

**Constat** : `app/(app)/recipes/_recipe-form.tsx` envoie le fichier choisi tel quel à Supabase Storage (`supabase.storage.from('recipe-photos').upload(...)`, ligne ~229) — pas de redimensionnement, pas de compression/conversion WebP, pas d'extraction de couleur dominante, pas de génération de BlurHash/ThumbHash. `recipes.photo_url` pointe donc directement vers le fichier brut tel qu'uploadé, quelle que soit sa taille ou son poids.

Trouvé en améliorant l'affichage des photos sur l'écran Accueil (`components/home/framed-photo.tsx`) : côté affichage, le rendu compense déjà (fond flouté/saturé + image complète jamais rognée), mais rien ne compense une photo très lourde (temps de chargement) ou de mauvaise qualité (le flou n'arrange pas une photo réellement floue/sombre à la source).

**Décision** : reporté. Construire ce pipeline (redimensionnement + compression + formats modernes à l'upload, éventuellement BlurHash pour un placeholder instantané, recadrage avec point focal) est un chantier à part — touche le flux d'upload existant et possiblement de nouvelles colonnes (couleur dominante, hash de prévisualisation), pas un ajustement d'écran.
