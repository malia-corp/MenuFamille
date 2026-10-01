# MenuFamille — Écarts d'implémentation vs. plan

Ce fichier trace les cas où le code réel diverge de ce qu'un prompt de sprint ou une lecture du CDC/`decisions.md` laisserait attendre, ou des lacunes connues et volontairement reportées — pour que les prompts des sprints suivants ne redécouvrent pas ce qui est déjà su.

---

## 1. Pas d'UI pour switcher entre plusieurs cercles familiaux

**Constat** : `app/(app)/circle/page.tsx` n'affiche jamais que `circles[0]` (commentaire dans le code : "MVP : un seul cercle à la fois"). Dès qu'une utilisatrice appartient à 2+ cercles (ex. elle en crée un second), le premier devient invisible dans cette page — pas de sélecteur, pas d'onglets, rien pour y revenir depuis l'UI.

**Ce qui fonctionne déjà malgré ça** (vérifié, aucun changement backend nécessaire pour une future UI de sélection) :
- `GET /api/circles` renvoie **tous** les cercles de l'utilisatrice, pas seulement le premier — la limitation est uniquement dans le rendu de `circle/page.tsx`.
- `GET/POST /api/circles/:id/members/:userId/prefs` et `DELETE .../prefs/:prefId` (préférences alimentaires, ajoutées pour l'exclusion d'allergènes) acceptent n'importe quel `:id` de cercle en paramètre, pas seulement celui affiché à l'écran.
- La génération automatique (`generate/route.ts`) et le badge d'allergènes (`GET /api/meal-plans`) agrègent déjà les allergènes stricts de **tous** les cercles de l'utilisatrice qui planifie, pas d'un cercle unique — décision actée précisément parce qu'il n'y a pas de notion de "cercle actif" (`meal_plans.circle_id` n'est d'ailleurs jamais renseigné non plus, même constat).

**Décision** : reporté à un futur "sprint polish" (UI de sélection de cercle). Une fois cette UI construite, elle n'aura qu'à choisir quel cercle afficher/cibler — aucune des API listées ci-dessus n'a besoin d'être modifiée pour ça.

---

## 2. Liste de courses — schéma présent en base, aucune route ni UI

**Constat** : les tables `shopping_lists`/`shopping_list_items` existent depuis la migration `20260701090005_e_shopping_pantry.sql` (statut `active`/`completed`/`archived`, items rattachés à `pantry_categories`), mais **aucune route `/api/shopping*` et aucune page `/shopping` n'existent** — pas de génération automatique depuis un plan de menu, pas de CRUD. Trouvé en construisant l'écran Accueil (prompt de maquette KeskonBouf, widget "Courses & Marché" côté desktop), omis de cet écran pour cette raison.

**Décision** : fonctionnalité à construire dans son propre sprint ("Liste de courses" fait partie du périmètre CDC — ce n'est pas un report hors-scope, juste une feature pas encore attaquée). Le widget desktop correspondant pourra être ajouté à `app/(app)/page.tsx` une fois l'API disponible, sans toucher au reste de l'écran.

---

## 3. Upload de photo de recette — aucun traitement serveur

**Constat** : `app/(app)/recipes/_recipe-form.tsx` envoie le fichier choisi tel quel à Supabase Storage (`supabase.storage.from('recipe-photos').upload(...)`, ligne ~229) — pas de redimensionnement, pas de compression/conversion WebP, pas d'extraction de couleur dominante, pas de génération de BlurHash/ThumbHash. `recipes.photo_url` pointe donc directement vers le fichier brut tel qu'uploadé, quelle que soit sa taille ou son poids.

Trouvé en améliorant l'affichage des photos sur l'écran Accueil (`components/home/framed-photo.tsx`) : côté affichage, le rendu compense déjà (fond flouté/saturé + image complète jamais rognée), mais rien ne compense une photo très lourde (temps de chargement) ou de mauvaise qualité (le flou n'arrange pas une photo réellement floue/sombre à la source).

**Décision** : reporté. Construire ce pipeline (redimensionnement + compression + formats modernes à l'upload, éventuellement BlurHash pour un placeholder instantané, recadrage avec point focal) est un chantier à part — touche le flux d'upload existant et possiblement de nouvelles colonnes (couleur dominante, hash de prévisualisation), pas un ajustement d'écran.
