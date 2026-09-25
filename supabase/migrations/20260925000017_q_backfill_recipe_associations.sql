-- ============================================================================
-- MenuFamille — Migration 0017 — Amorçage recipe_associations depuis meal_compositions
-- ============================================================================
-- Donne du signal des le jour 1 plutot qu'un cold-start generalise : chaque
-- paire (plat, accompagnement/boisson) deja planifiee devient une ligne
-- personnelle attribuee au proprietaire du plan concerne.

insert into recipe_associations (recipe_id, associated_recipe_id, role, user_id, source, frequency)
select
  mpi.recipe_id,
  mc.recipe_id,
  mc.role,
  p.user_id,
  'planning',
  count(*)
from meal_compositions mc
join meal_plan_items mpi on mpi.id = mc.meal_plan_item_id
join meal_plans p on p.id = mpi.meal_plan_id
where p.user_id is not null
  and mpi.recipe_id is not null
group by mpi.recipe_id, mc.recipe_id, mc.role, p.user_id
on conflict (recipe_id, associated_recipe_id, role, user_id)
do update set
  frequency    = recipe_associations.frequency + excluded.frequency,
  last_used_at = now();
