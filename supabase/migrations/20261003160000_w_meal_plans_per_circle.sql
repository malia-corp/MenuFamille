-- Menus rattachés au cercle : activer un cercle bascule toute l'app sur ses
-- menus (menu de la semaine, menu du jour, planification). Jusqu'ici un menu
-- n'appartenait qu'à son auteur (meal_plans.circle_id jamais renseigné) : une
-- planificatrice de deux cercles voyait le même menu dans les deux.

-- 1. Rattrapage : chaque menu existant rejoint le premier cercle où son auteur
--    est planificatrice (le cercle affiché jusqu'ici). Sans cercle : reste NULL.
update meal_plans p
set circle_id = (
  select m.circle_id
  from family_circle_members m
  where m.user_id = p.user_id and m.role = 'planificatrice'
  order by m.joined_at
  limit 1
)
where p.circle_id is null;

-- 2. Unicité par (auteur, cercle, semaine) au lieu de (auteur, semaine) :
--    une même planificatrice peut avoir un menu par cercle pour une semaine.
--    Même exception qu'avant pour les menus finalisés.
drop index if exists meal_plans_user_week_unique_active;
create unique index meal_plans_user_circle_week_unique_active
  on meal_plans (user_id, coalesce(circle_id, '00000000-0000-0000-0000-000000000000'::uuid), week_start)
  where status <> 'finalized';
