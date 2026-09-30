-- ============================================================================
-- MenuFamille — Migration 0018 — Suppression de recipe_type
-- ============================================================================
-- recipe_type (plat_principal|accompagnement|boisson|sauce, Sprint 5)
-- modelisait mal le role "accompagnement" : ce n'est pas une propriete
-- intrinseque d'une recette, c'est une relation contextuelle entre deux
-- recettes definie par l'usage. Remplace par recipe_associations
-- (migration 20260925000016_p), qui apprend les paires reellement
-- utilisees plutot que de figer un role par recette.
--
-- A appliquer en dernier, une fois le code applicatif deploye sans plus
-- aucune reference a recipe_type (verifie : plus aucun point d'appel dans
-- app/ ni lib/ hors commentaires et database.types.ts, qui sera regenere
-- juste apres cette migration).

alter table recipes drop column recipe_type;
drop type recipe_type_enum;
