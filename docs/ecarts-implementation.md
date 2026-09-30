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
