-- ============================================================================
-- MenuFamille — Migration 0013 — recipe_type + meal_compositions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enum
-- ----------------------------------------------------------------------------
create type recipe_type_enum as enum (
  'plat_principal',
  'accompagnement',
  'boisson',
  'sauce'
);

-- ----------------------------------------------------------------------------
-- Colonne recipe_type sur recipes
-- ----------------------------------------------------------------------------
alter table recipes
  add column recipe_type recipe_type_enum not null default 'plat_principal';

-- ----------------------------------------------------------------------------
-- Table MEAL_COMPOSITIONS
-- ----------------------------------------------------------------------------
create table meal_compositions (
  id                uuid primary key default gen_random_uuid(),
  meal_plan_item_id uuid not null references meal_plan_items(id) on delete cascade,
  recipe_id         uuid not null references recipes(id) on delete cascade,
  role              text not null check (role in ('side', 'drink')),
  sort_order        integer not null default 0,
  unique (meal_plan_item_id, recipe_id)
);

comment on table meal_compositions is 'Accompagnements et boissons associes a un item du plan — CDC 5.2';
comment on column meal_compositions.role is 'side = accompagnement, drink = boisson';

create index idx_meal_compositions_item on meal_compositions(meal_plan_item_id);

alter table meal_compositions enable row level security;

-- SELECT pour le proprietaire du plan et les membres du cercle
create policy meal_compositions_select on meal_compositions
  for select using (
    exists (
      select 1 from meal_plan_items mpi
      join meal_plans p on p.id = mpi.meal_plan_id
      where mpi.id = meal_plan_item_id
        and (
          p.user_id = auth.uid()
          or (
            p.circle_id is not null
            and is_circle_member(p.circle_id, auth.uid())
          )
        )
    )
  );

-- SELECT public pour les plans partages (page /s/[token] sans authentification)
create policy meal_compositions_shared_select on meal_compositions
  for select using (
    exists (
      select 1 from meal_plan_items mpi
      join meal_plans p on p.id = mpi.meal_plan_id
      where mpi.id = meal_plan_item_id
        and p.share_token is not null
    )
  );

-- WRITE uniquement pour le proprietaire du plan
create policy meal_compositions_write on meal_compositions
  for all using (
    exists (
      select 1 from meal_plan_items mpi
      join meal_plans p on p.id = mpi.meal_plan_id
      where mpi.id = meal_plan_item_id
        and p.user_id = auth.uid()
    )
  );
