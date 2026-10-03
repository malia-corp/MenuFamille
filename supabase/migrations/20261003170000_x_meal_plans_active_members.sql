-- Menus du cercle : lecture réservée à l'auteur et aux membres ACTIFS du
-- cercle du menu (un membre désactivé par la planificatrice ne voit plus le
-- menu de la semaine, cf. migration v_circle_member_status). Les menus étant
-- désormais rattachés à leur cercle (migration w), ces policies s'appliquent
-- réellement.

drop policy meal_plans_select_owner_or_circle on meal_plans;
create policy meal_plans_select_owner_or_circle on meal_plans
  for select using (
    user_id = auth.uid()
    or (circle_id is not null and is_active_circle_member(circle_id, auth.uid()))
  );

drop policy meal_plan_items_select_via_plan on meal_plan_items;
create policy meal_plan_items_select_via_plan on meal_plan_items
  for select using (
    exists (
      select 1 from meal_plans p
      where p.id = meal_plan_id
        and (p.user_id = auth.uid() or (p.circle_id is not null and is_active_circle_member(p.circle_id, auth.uid())))
    )
  );

drop policy meal_compositions_select on meal_compositions;
create policy meal_compositions_select on meal_compositions
  for select using (
    exists (
      select 1 from meal_plan_items mpi
      join meal_plans p on p.id = mpi.meal_plan_id
      where mpi.id = meal_plan_item_id
        and (
          p.user_id = auth.uid()
          or (p.circle_id is not null and is_active_circle_member(p.circle_id, auth.uid()))
        )
    )
  );
