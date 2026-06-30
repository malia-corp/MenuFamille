-- ============================================================================
-- MenuFamille — Migration 0002 — Recettes & contribution
-- Domaine CDC v3.0 — section 10.2
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type recipe_visibility_enum as enum ('private', 'circle', 'community');
create type recipe_difficulty_enum as enum ('facile', 'moyen', 'difficile');

-- ----------------------------------------------------------------------------
-- CATEGORIES (catégories de recettes)
-- ----------------------------------------------------------------------------
create table categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text not null unique,
  icon  text,
  color text
);

comment on table categories is 'Catégories de recettes (plat principal, dessert, sauce...) — CDC 10.2';

-- ----------------------------------------------------------------------------
-- PANTRY_CATEGORIES (catégories de courses / garde-manger)
-- ----------------------------------------------------------------------------
create table pantry_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text,
  sort_order integer not null default 0
);

comment on table pantry_categories is 'Catégories utilisées pour trier la liste de courses et le garde-manger — CDC 10.2 / 10.5';

-- ----------------------------------------------------------------------------
-- RECIPES
-- ----------------------------------------------------------------------------
create table recipes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references users(id) on delete set null,
  category_id       uuid references categories(id) on delete set null,
  circle_id         uuid references family_circles(id) on delete set null,
  parent_recipe_id  uuid references recipes(id) on delete set null,
  name              text not null,
  slug              text not null,
  name_fingerprint  text not null,
  variant_label     text,
  description       text,
  prep_time_min     integer,
  cook_time_min     integer,
  servings          integer not null default 4,
  difficulty        recipe_difficulty_enum,
  photo_url         text,
  visibility        recipe_visibility_enum not null default 'private',
  source_url        text,
  created_at        timestamptz not null default now(),

  constraint chk_circle_visibility_consistency check (
    -- circle_id n'a de sens que si visibility = 'circle' ; on tolère NULL dans les autres cas
    (visibility = 'circle' and circle_id is not null) or (visibility <> 'circle')
  )
);

comment on table recipes is 'Recette — carnet personnel et base communautaire — CDC 5.3, 10.2';
comment on column recipes.user_id is 'Auteur ; ON DELETE SET NULL pour qu''une recette communautaire survive à la suppression du compte de son auteur';
comment on column recipes.visibility is 'private (défaut) / circle / community — CDC 5.3.1';
comment on column recipes.name_fingerprint is 'Nom normalisé (minuscule, sans accents, espaces compressés) — utilisé pour la détection de similarité, CDC 5.3.2';
comment on column recipes.parent_recipe_id is 'Recette parente si cette recette est une variante — CDC 5.3.2';

-- Index de similarité de noms (trigrammes) — coeur du mécanisme anti-doublon CDC 5.3.2.
-- La comparaison doit toujours être filtrée par périmètre de visibilité au niveau applicatif
-- (jamais comparer une recette communautaire à une recette privée d'un autre utilisateur).
create index idx_recipes_name_fingerprint_trgm on recipes using gin (name_fingerprint gin_trgm_ops);
create index idx_recipes_user on recipes(user_id);
create index idx_recipes_circle on recipes(circle_id);
create index idx_recipes_visibility on recipes(visibility);
create index idx_recipes_parent on recipes(parent_recipe_id);

-- ----------------------------------------------------------------------------
-- RECIPE_IMPORTS
-- ----------------------------------------------------------------------------
create table recipe_imports (
  id             uuid primary key default gen_random_uuid(),
  recipe_id      uuid not null references recipes(id) on delete cascade,
  source_url     text not null,
  parser_version text not null,
  raw_html_hash  text,
  imported_at    timestamptz not null default now()
);

comment on table recipe_imports is 'Traçabilité d''une recette importée depuis une URL — CDC 5.3.3 / 10.2';

-- ----------------------------------------------------------------------------
-- RECIPE_INGREDIENTS
-- ----------------------------------------------------------------------------
create table recipe_ingredients (
  id             uuid primary key default gen_random_uuid(),
  recipe_id      uuid not null references recipes(id) on delete cascade,
  pantry_cat_id  uuid references pantry_categories(id) on delete set null,
  name           text not null,
  quantity       numeric(10,2),
  unit           text,
  sort_order     integer not null default 0
);

comment on table recipe_ingredients is 'Ingrédients d''une recette, pour les portions de base — CDC 10.2';
create index idx_recipe_ingredients_recipe on recipe_ingredients(recipe_id);

-- ----------------------------------------------------------------------------
-- RECIPE_STEPS
-- ----------------------------------------------------------------------------
create table recipe_steps (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references recipes(id) on delete cascade,
  step_number  integer not null,
  description  text not null,
  duration_min integer,
  unique (recipe_id, step_number)
);

comment on table recipe_steps is 'Étapes de préparation, ordonnées — CDC 10.2';
create index idx_recipe_steps_recipe on recipe_steps(recipe_id);

-- ----------------------------------------------------------------------------
-- RECIPE_FAVORITES
-- ----------------------------------------------------------------------------
create table recipe_favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  recipe_id  uuid not null references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

comment on table recipe_favorites is 'Recettes marquées favorites par un utilisateur — CDC 10.2';
create index idx_recipe_favorites_user on recipe_favorites(user_id);
