-- ============================================================================
-- MenuFamille — Migration 0005 — Courses & garde-manger
-- Domaine CDC v3.0 — section 10.5
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type shopping_list_status_enum as enum ('active', 'completed', 'archived');

-- ----------------------------------------------------------------------------
-- SHOPPING_LISTS
-- ----------------------------------------------------------------------------
create table shopping_lists (
  id            uuid primary key default gen_random_uuid(),
  meal_plan_id  uuid not null references meal_plans(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  status        shopping_list_status_enum not null default 'active',
  generated_at  timestamptz not null default now()
);

comment on table shopping_lists is 'Liste de courses générée à partir d''un plan de menu — CDC 5.11, 10.5';

create index idx_shopping_lists_plan on shopping_lists(meal_plan_id);
create index idx_shopping_lists_user on shopping_lists(user_id);

-- ----------------------------------------------------------------------------
-- SHOPPING_LIST_ITEMS
-- ----------------------------------------------------------------------------
create table shopping_list_items (
  id               uuid primary key default gen_random_uuid(),
  list_id          uuid not null references shopping_lists(id) on delete cascade,
  pantry_cat_id    uuid references pantry_categories(id) on delete set null,
  ingredient_name  text not null,
  quantity         numeric(10,2),
  unit             text,
  is_checked       boolean not null default false,
  is_from_pantry   boolean not null default false,
  sort_order       integer not null default 0
);

comment on table shopping_list_items is 'Article consolidé d''une liste de courses — CDC 5.11, 10.5';

create index idx_shopping_list_items_list on shopping_list_items(list_id);

-- ----------------------------------------------------------------------------
-- PANTRY_ITEMS
-- ----------------------------------------------------------------------------
create table pantry_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  pantry_cat_id    uuid references pantry_categories(id) on delete set null,
  ingredient_name  text not null,
  quantity         numeric(10,2),
  unit             text,
  updated_at       timestamptz not null default now(),
  unique (user_id, ingredient_name)
);

comment on table pantry_items is 'Inventaire personnel du garde-manger — CDC 5.12, 10.5';

create index idx_pantry_items_user on pantry_items(user_id);

-- ----------------------------------------------------------------------------
-- Trigger générique : maintenir updated_at à jour sur pantry_items
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_pantry_items_updated_at
  before update on pantry_items
  for each row
  execute function set_updated_at();
