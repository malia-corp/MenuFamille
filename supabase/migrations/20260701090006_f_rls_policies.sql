-- ============================================================================
-- MenuFamille — Migration 0006 — Sécurité (Row Level Security)
-- CDC v3.0 — sections 9.2 et 11.2 : la visibilité est un filtre de requête
-- systématique, jamais une vérification applicative a posteriori.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : l'utilisateur courant appartient-il au cercle donné ?
-- Centralisée ici pour être réutilisée par toutes les policies qui en ont besoin.
-- ----------------------------------------------------------------------------
create or replace function is_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from family_circle_members
    where circle_id = p_circle_id and user_id = p_user_id
  );
$$ language sql stable security definer;

-- ============================================================================
-- USERS
-- ============================================================================
alter table users enable row level security;

create policy users_select_self on users
  for select using (id = auth.uid());

create policy users_update_self on users
  for update using (id = auth.uid());

-- ============================================================================
-- FAMILY_CIRCLES / FAMILY_CIRCLE_MEMBERS
-- ============================================================================
alter table family_circles enable row level security;
alter table family_circle_members enable row level security;

create policy circles_select_member on family_circles
  for select using (is_circle_member(id, auth.uid()));

create policy circles_insert_self on family_circles
  for insert with check (created_by = auth.uid());

create policy circle_members_select_same_circle on family_circle_members
  for select using (is_circle_member(circle_id, auth.uid()));

create policy circle_members_insert_self on family_circle_members
  for insert with check (user_id = auth.uid());

create policy circle_members_delete_self_or_planificatrice on family_circle_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from family_circle_members m
      where m.circle_id = family_circle_members.circle_id
        and m.user_id = auth.uid()
        and m.role = 'planificatrice'
    )
  );

-- ============================================================================
-- RECIPES — policy la plus sensible du projet (CDC 5.3.1 / 11.2)
-- ============================================================================
alter table recipes enable row level security;

create policy recipes_select_by_visibility on recipes
  for select using (
    visibility = 'community'
    or user_id = auth.uid()
    or (visibility = 'circle' and circle_id is not null and is_circle_member(circle_id, auth.uid()))
  );

create policy recipes_insert_self on recipes
  for insert with check (user_id = auth.uid());

create policy recipes_update_self on recipes
  for update using (user_id = auth.uid());

create policy recipes_delete_self on recipes
  for delete using (user_id = auth.uid());

-- Tables enfants de RECIPES : héritent de la visibilité de la recette parente
alter table recipe_ingredients enable row level security;
alter table recipe_steps enable row level security;
alter table recipe_imports enable row level security;

create policy recipe_ingredients_select on recipe_ingredients
  for select using (
    exists (select 1 from recipes r where r.id = recipe_id)
    -- la policy SELECT de recipes s'applique déjà via la jointure implicite RLS sur recipes
  );

create policy recipe_ingredients_write_owner on recipe_ingredients
  for all using (
    exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

create policy recipe_steps_select on recipe_steps
  for select using (
    exists (select 1 from recipes r where r.id = recipe_id)
  );

create policy recipe_steps_write_owner on recipe_steps
  for all using (
    exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

create policy recipe_imports_owner_only on recipe_imports
  for all using (
    exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

-- RECIPE_FAVORITES — toujours personnel
alter table recipe_favorites enable row level security;

create policy recipe_favorites_owner_only on recipe_favorites
  for all using (user_id = auth.uid());

-- ============================================================================
-- USER_MEAL_CONFIG — toujours personnel
-- ============================================================================
alter table user_meal_config enable row level security;

create policy user_meal_config_owner_only on user_meal_config
  for all using (user_id = auth.uid());

-- ============================================================================
-- MEAL_PLANS / MEAL_PLAN_ITEMS
-- ============================================================================
alter table meal_plans enable row level security;
alter table meal_plan_items enable row level security;

create policy meal_plans_select_owner_or_circle on meal_plans
  for select using (
    user_id = auth.uid()
    or (circle_id is not null and is_circle_member(circle_id, auth.uid()))
  );

create policy meal_plans_write_owner on meal_plans
  for all using (user_id = auth.uid());

create policy meal_plan_items_select_via_plan on meal_plan_items
  for select using (
    exists (
      select 1 from meal_plans p
      where p.id = meal_plan_id
        and (p.user_id = auth.uid() or (p.circle_id is not null and is_circle_member(p.circle_id, auth.uid())))
    )
  );

create policy meal_plan_items_write_via_plan_owner on meal_plan_items
  for all using (
    exists (select 1 from meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid())
  );

-- Note : l'accès public (non authentifié) au menu et au sondage via share_token
-- ne passe pas par RLS mais par un endpoint serveur dédié qui valide le token
-- et la date d'expiration côté API (service role), conformément au CDC 5.7/11.2.

-- ============================================================================
-- SURVEY_RESPONSES / SURVEY_ANSWERS
-- ============================================================================
alter table survey_responses enable row level security;
alter table survey_answers enable row level security;

create policy survey_responses_select_plan_owner on survey_responses
  for select using (
    exists (select 1 from meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid())
    or user_id = auth.uid()
  );

create policy survey_answers_select_via_response on survey_answers
  for select using (
    exists (
      select 1 from survey_responses sr
      join meal_plans p on p.id = sr.meal_plan_id
      where sr.id = response_id and (p.user_id = auth.uid() or sr.user_id = auth.uid())
    )
  );

-- L'écriture des réponses au sondage (répondant anonyme via lien) se fait par
-- l'API serveur (service role), pas directement par le client — pas de policy
-- INSERT publique ici par conception (CDC 11.2 : rate limiting et validation serveur).

-- ============================================================================
-- NOTIFICATION_PREFS / MEAL_FEEDBACK — personnel ou via plan
-- ============================================================================
alter table notification_prefs enable row level security;
alter table meal_feedback enable row level security;
alter table feedback_templates enable row level security;

create policy notification_prefs_owner_only on notification_prefs
  for all using (user_id = auth.uid());

create policy meal_feedback_select_via_plan on meal_feedback
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from meal_plan_items mpi
      join meal_plans p on p.id = mpi.meal_plan_id
      where mpi.id = meal_plan_item_id and p.user_id = auth.uid()
    )
  );

create policy meal_feedback_insert_self on meal_feedback
  for insert with check (user_id = auth.uid() or user_id is null);

create policy feedback_templates_select_all on feedback_templates
  for select using (is_active);

-- ============================================================================
-- SHOPPING_LISTS / SHOPPING_LIST_ITEMS / PANTRY_ITEMS — toujours personnel
-- ============================================================================
alter table shopping_lists enable row level security;
alter table shopping_list_items enable row level security;
alter table pantry_items enable row level security;

create policy shopping_lists_owner_only on shopping_lists
  for all using (user_id = auth.uid());

create policy shopping_list_items_via_list_owner on shopping_list_items
  for all using (
    exists (select 1 from shopping_lists l where l.id = list_id and l.user_id = auth.uid())
  );

create policy pantry_items_owner_only on pantry_items
  for all using (user_id = auth.uid());

-- ============================================================================
-- CATEGORIES / PANTRY_CATEGORIES — référentiels en lecture libre
-- ============================================================================
alter table categories enable row level security;
alter table pantry_categories enable row level security;

create policy categories_select_all on categories for select using (true);
create policy pantry_categories_select_all on pantry_categories for select using (true);
