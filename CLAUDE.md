# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# MenuFamille (nom commercial : KeskonBouf)

Guide de travail pour les sessions de développement pair-programmeur (Claude Code). PWA mobile-first, interface en français. Le code et la doc mélangent « MenuFamille » (nom du projet/repo) et « KeskonBouf » (marque affichée, préfixe `kkb-` des caches du service worker).

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

## Workflow Git — branche + Pull Request

Plus aucun commit n'est poussé directement sur `main`. Pour chaque tâche logique :

1. Créer une branche **à partir de la branche de la tâche précédente** (pas systématiquement depuis `main`), pour garder une chaîne logique entre tâches liées tant qu'elles n'ont pas été mergées : `git checkout -b <type>/<scope>-<slug>` depuis la branche en cours.
   - `<type>` : `feat`, `fix` ou `chore`, aligné sur la convention de commit
   - `<scope>` : ID de story (`MF-012`) si disponible, sinon `sprint0`/`sprintN`
   - `<slug>` : description courte en kebab-case
   - Exemples : `feat/sprint0-jour3-seed-data` → `feat/sprint0-jour3-connexion-supabase` (créée depuis la première, pas depuis `main`)
   - Une fois une branche mergée sur `main` par la développeuse, la branche suivante peut repartir d'un `main` à jour (`git checkout main && git pull`) si la chaîne n'a plus de raison d'être maintenue
2. Committer sur cette branche (convention habituelle `feat(ID-story): ...`) — automatique, pas besoin de validation préalable
3. **Attendre une validation explicite de la développeuse avant de pousser** (ex. "tu peux pusher"). Ne jamais enchaîner commit et push automatiquement, et ne pas interpréter l'approbation d'un commit comme une approbation du push qui suit. Une fois validé : `git push -u origin <branche>`
4. Ouvrir la Pull Request manuellement sur GitHub (lien de comparaison fourni à chaque push) — la PR d'une branche enfant cible sa branche parente tant que celle-ci n'est pas mergée, pour refléter la chaîne réelle
5. Revue et merge effectués par la développeuse via l'interface GitHub — jamais de merge automatique

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

## Icônes — lucide-react, pas d'emojis

- Toute icône d'interface utilise `lucide-react`. Ne jamais écrire d'emoji littéral dans le code : les caractères emoji ne sont pas acceptés par la plateforme de déploiement.
- Types de repas : utiliser `MEAL_ICON` (`lib/constants/meal-type-icon.ts`) — `Coffee` (petit-déj.), `UtensilsCrossed` (déjeuner), `Cookie` (goûter), `Moon` (dîner). En JSX, `<MealTypeIcon type={...} />` (`components/ui/meal-type-icon.tsx`).
- Correspondances établies : accompagnement `Salad`, boisson `CupSoda`, catégorie `Tag`, jour/semaine `CalendarDays`, sauvegarde `Check`.
- Seule exception : les emojis de réaction (vote du sondage 😊/😐/😕, feedback post-repas), écrits en échappements unicode (`'\u{1F60A}'`), jamais en caractère littéral. Idem pour les textes de notification push, où une icône React est impossible.
- `MEAL_EMOJI` (`lib/constants/meal-type.ts`) est conservé pour ces seuls contextes texte (notifications) ; ne pas l'utiliser dans l'interface.

---

## Partage — un seul modèle

Tout partage (lien de sondage, récap, invitation au cercle…) passe par `<ShareActions>` (`components/ui/share-actions.tsx`) : bouton « Partager » qui ouvre la feuille de partage native de l'appareil (WhatsApp, SMS, mail…, affiché seulement si `navigator.share` existe) + bouton « Copier ». Jamais de lien `wa.me` ni de bouton dédié à une application.

- Contenus réutilisables : `surveyLinkPayload(token)` (lien du sondage), `circleInvitePayload(nom, code)` (invitation, « Copier » copie le code seul).
- Un nouveau type de partage = une nouvelle fonction `...Payload` dans ce même fichier.

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

```

Pas de framework de tests : la vérification passe par `npm run lint` et `npm run build` (le build fait le contrôle de types TypeScript). La CLI `supabase` est une devDependency : `npx supabase ...` si elle n'est pas installée globalement.

Variables d'environnement (`.env.local.example` ne liste que les trois premières) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` (push), `CRON_SECRET` (tâches planifiées), `APP_URL` (origine publique, optionnelle).

---

## Architecture

Next.js 14 App Router + Supabase (Postgres, Auth OTP, Storage) + Zustand, déployé sur Vercel.

- **Routes** : `app/(auth)` (login, onboarding), `app/(app)` (écrans connectés), `app/s/[token]` (page publique de sondage, sans compte), `app/api/**` (Route Handlers REST — toute la logique métier est là, les pages client appellent ces API via `fetch`).
- **Trois clients Supabase** (`lib/supabase/`) :
  - `server.ts` → `createClient()` : client de session (cookies), soumis à la RLS. Sert surtout à `auth.getUser()`.
  - `service.ts` → `createServiceClient()` : service role, **contourne la RLS**. Utilisé dans la plupart des routes API, uniquement après le contrôle d'authentification ; les droits (membre actif, rôle planificatrice…) sont alors vérifiés dans le code.
  - `client.ts` : client navigateur.
  - Patron d'une route : `createClient()` → `auth.getUser()` → 401 si absent → `createServiceClient()` pour les requêtes.
- **Middleware** (`lib/supabase/middleware.ts`) : rafraîchit la session et redirige vers `/login`, sauf chemins publics (`/login`, `/api/auth`, `/s/`, `/api/surveys`, `/api/jobs/`). Toute nouvelle route publique doit être ajoutée ici.
- **Cercle actif** : `resolveActiveCircleId()` (`lib/utils/active-circle.ts`) pilote toute l'app (accueil, menus via `meal_plans.circle_id`, allergènes). `familyContext()` (`lib/utils/family-plan.ts`) donne rôle, statut et planificatrice du cercle actif. Un membre désactivé (`family_circle_members.is_active = false`) perd l'accès : voir `lib/utils/circle-access.ts`.
- **Sondage public** : tout accès par token passe par `resolveSurveyPlan()` (`lib/utils/survey-token.ts`) ; `token_expires_at` NULL = n'expire jamais. Ne pas refaire la requête dans une route.
- **Tâches planifiées** : `app/api/jobs/*` (rappels, demandes de feedback, envoi push via `web-push`), appelées par un cron externe avec l'en-tête `x-cron-secret`.
- **Hors connexion / push** : `public/sw.js` écrit à la main (pas de next-pwa), enregistré via `lib/utils/service-worker.ts` (`?dev=1` en dev désactive le cache). Incrémenter `VERSION` dans `sw.js` quand la stratégie de cache ou les ressources statiques changent. Les caches `kkb-user-*` sont vidés à la déconnexion (`lib/utils/logout.ts`).
- **App mobile** : `mobile/` (Expo / React Native, expo-router) reprend les écrans et appelle les mêmes routes `/api/*` avec `Authorization: Bearer <jeton>` (reconnu par `createClient()` et le middleware). Exclue du lint et du `tsconfig` web ; vérification : `cd mobile && npm run typecheck`. Voir `mobile/README.md` et `docs/ecarts-implementation.md` §4.
- **Types DB** : `lib/supabase/database.types.ts` est généré — le régénérer après chaque migration plutôt que l'éditer à la main.

### Documentation de référence (`docs/`)

- `decisions.md` — décisions de cadrage (résumées plus bas)
- `ecarts-implementation.md` — écarts connus entre CDC/prompts et code réel, lacunes reportées. À lire avant de chercher une structure « attendue » ; y ajouter tout nouvel écart.
- `api_et_vues_menufamille.md` — inventaire vues front / API back par domaine
- `design_menufamille.md` — brief de design (palette et typographie implémentées dans `app/globals.css`)
- `docs/sql/` — schéma SQL historique ; la source de vérité est `supabase/migrations/`

---

## Structure de migration

Les migrations sont dans `supabase/migrations/`, nommées `<horodatage>_<lettre>_<slug>.sql`. Le schéma initial est découpé par domaine fonctionnel :

- `*_a_users_circles.sql` — profils, cercles familiaux
- `*_b_recipes_contribution.sql` — recettes, catégories
- `*_c_config_planning.sql` — configuration repas, planification
- `*_d_survey_feedback.sql` — sondage, feedback, notifications
- `*_e_shopping_pantry.sql` — courses, garde-manger
- `*_f_rls_policies.sql` — politiques RLS

Chaque évolution suivante est une migration courte et ciblée qui prend la lettre suivante (`g`, `h`… jusqu'à `x` actuellement ; la prochaine est `y`). Ne jamais modifier une migration déjà appliquée ni créer une migration monolithique. Seed : `supabase/seed/`.
