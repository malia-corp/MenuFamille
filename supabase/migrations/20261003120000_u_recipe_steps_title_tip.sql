-- ============================================================================
-- MenuFamille — Migration u — Titre d'étape et astuce de recette
-- Domaine : recettes (CDC 10.2) — carnet culinaire, sprint 4
-- ============================================================================

-- Titre court optionnel d'une étape ("Préparation du poulet"), affiché au-dessus
-- de sa description dans le détail de la recette.
alter table recipe_steps
  add column title text;

comment on column recipe_steps.title is 'Titre court optionnel de l''étape — affiché au-dessus de la description';

-- Astuce transmise avec la recette ("Astuces de Maman"), distincte de la
-- description qui présente le plat.
alter table recipes
  add column tip text;

comment on column recipes.tip is 'Astuce ou secret de famille transmis avec la recette — distincte de la description';
