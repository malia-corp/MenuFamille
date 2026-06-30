-- ============================================================================
-- MenuFamille — Migration 0003 — Configuration & planification des repas
-- Domaine CDC v3.0 — section 10.3
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type meal_type_enum as enum ('petit_dejeuner', 'dejeuner', 'gouter', 'diner');
create type meal_mode_enum as enum ('daily', 'template');
create type day_of_week_enum as enum ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche');
create type meal_plan_status_enum as enum ('draft', 'shared', 'finalized');

-- ----------------------------------------------------------------------------
-- USER_MEAL_CONFIG
-- ----------------------------------------------------------------------------
create table user_meal_config (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  meal_type     meal_type_enum not null,
  is_active     boolean not null default true,
  mode          meal_mode_enum not null default 'daily',
  display_order integer not null default 0,
  default_time  text,
  unique (user_id, meal_type)
);

comment on table user_meal_config is 'Configuration des 4 types de repas par utilisateur (actif/inactif, mode modèle/quotidien) — CDC 5.1, 10.3';
comment on column user_meal_config.default_time is 'Heure indicative affichée à l''utilisateur, ex. "07h30" (format texte volontairement libre)';

create index idx_user_meal_config_user on user_meal_config(user_id);

-- ----------------------------------------------------------------------------
-- MEAL_PLANS
-- ----------------------------------------------------------------------------
create table meal_plans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  circle_id         uuid references family_circles(id) on delete set null,
  week_start        date not null,
  share_token       text unique,
  token_expires_at  timestamptz,
  status            meal_plan_status_enum not null default 'draft',
  created_at        timestamptz not null default now()
);

comment on table meal_plans is 'Plan de menu hebdomadaire — CDC 5.2, 10.3';
comment on column meal_plans.share_token is 'Token public utilisé pour le lien de partage (menu + sondage) — CDC 5.7';

create index idx_meal_plans_user on meal_plans(user_id);
create index idx_meal_plans_circle on meal_plans(circle_id);
create index idx_meal_plans_share_token on meal_plans(share_token);

-- ----------------------------------------------------------------------------
-- MEAL_PLAN_ITEMS
-- ----------------------------------------------------------------------------
create table meal_plan_items (
  id                uuid primary key default gen_random_uuid(),
  meal_plan_id      uuid not null references meal_plans(id) on delete cascade,
  recipe_id         uuid references recipes(id) on delete set null,
  day_of_week       day_of_week_enum not null,
  meal_type         meal_type_enum not null,
  applies_all_days  boolean not null default false,
  custom_name       text,
  servings          integer not null default 4,
  is_locked         boolean not null default false,
  sort_order        integer not null default 0,

  constraint chk_recipe_or_custom_name check (
    recipe_id is not null or custom_name is not null
  )
);

comment on table meal_plan_items is 'Repas assigné à une case de la grille hebdomadaire — CDC 5.5, 5.6, 10.3';
comment on column meal_plan_items.applies_all_days is 'Vrai pour les entrées en mode "modèle semaine" — day_of_week est alors ignoré côté affichage — CDC 5.1';

create index idx_meal_plan_items_plan on meal_plan_items(meal_plan_id);
create index idx_meal_plan_items_recipe on meal_plan_items(recipe_id);
