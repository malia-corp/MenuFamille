# Catalogue KeskonBouf

Recettes officielles proposées à tous les foyers dès leur arrivée dans l'app : elles alimentent le carnet (onglet Communauté, badge « KeskonBouf ») et la génération de menus. Décision du 16 novembre 2026.

## Principe : un rôle, pas d'écran dédié

Pas d'espace d'administration au MVP. Un compte **admin** utilise les écrans existants :

- **Ajouter** : formulaire d'ajout habituel, option « Catalogue KeskonBouf » dans « Qui la voit ? », avec le bloc **Provenance**.
- **Modifier** : tout admin peut modifier n'importe quelle recette du catalogue (menu « … » de la fiche → Modifier).
- **Retirer du catalogue** : menu « … » de la fiche. La recette redevient privée ; les menus qui l'utilisent restent intacts.
- **Supprimer** : impossible tant que la recette est au catalogue (la retirer d'abord).

Les écrans d'administration complets (utilisateurs, modération, journal des imports…) sont dans `BACKLOG_PHASE2.md`.

## Droit d'auteur : règles appliquées par le serveur

Une liste d'ingrédients et une méthode ne sont pas protégées ; le texte rédigé d'une recette et surtout les photos le sont. D'où les règles, vérifiées dans `lib/utils/catalog.ts` (et rappelées dans le formulaire) :

| Règle | Pourquoi |
|---|---|
| Provenance obligatoire : `maison`, `licence_libre` ou `accord_auteur`, et un auteur affiché | On sait toujours d'où vient une recette |
| Licence obligatoire pour une licence libre (ex. « CC BY-SA 4.0 ») | La licence impose de la citer |
| Lien vers l'auteur obligatoire pour un accord d'auteur | Trace de l'accord |
| Recette importée d'un site (lien) refusée | Le texte d'un site n'est pas réutilisable tel quel : la réécrire avec ses mots (import de texte ou saisie), citer le site en « Inspirée de » |
| Photo hébergée dans notre bucket uniquement, avec un crédit | Aucune image reprise d'un autre site |

La fiche affiche « Par {auteur} · {licence} », « Inspirée de {site} » et le crédit photo. Sans photo, la carte montre l'illustration de la catégorie.

Ce n'est pas un avis juridique : une validation par un avocat en propriété intellectuelle est conseillée avant le lancement public.

## Données (migration z)

- `users.app_role` : `user` (défaut) ou `admin`.
- `recipes.is_official` : recette du catalogue. Contrainte : toujours `community`, toujours avec `rights`.
- `recipes.rights` (jsonb) : `{ origin, author, license, inspired_by, photo_credit, checked_by, checked_at }`.
- Déclencheurs `trg_users_protect_app_role` et `trg_recipes_protect_official` : la RLS laisse chacun modifier sa ligne `users` et ses recettes depuis le navigateur ; ces colonnes n'y sont donc modifiables que par le serveur (service role), après contrôle du rôle.

## Donner le rôle admin

Aucun écran ne le permet. Après la première connexion du compte (pour que sa ligne `users` existe), dans l'éditeur SQL de Supabase :

```sql
update public.users set app_role = 'admin' where email = '<adresse du compte>';
```

Retirer le rôle : même requête avec `'user'`.

## Remise à zéro de la base

`npm run db:backup-reset` garde désormais le catalogue : recettes officielles (ingrédients, étapes, photos) et comptes admin (connexion et rôle). Leurs cercles et menus partent comme ceux des autres comptes : l'admin repasse par l'onboarding. `--with-catalog` vide aussi le catalogue.
