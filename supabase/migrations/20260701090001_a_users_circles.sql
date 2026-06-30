-- ============================================================================
-- MenuFamille — Migration 0001 — Extensions, Utilisateurs, Cercle familial
-- Domaine CDC v3.0 — section 10.1
-- ============================================================================

-- Extensions nécessaires
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- similarité de noms de recettes (détection de doublons, 5.3.2 du CDC)

-- ----------------------------------------------------------------------------
-- Enum partagé : rôle dans un cercle familial
-- ----------------------------------------------------------------------------
create type circle_role_enum as enum ('planificatrice', 'membre');

-- ----------------------------------------------------------------------------
-- USERS
-- Profil applicatif, étend auth.users (Supabase Auth gère l'authentification)
-- ----------------------------------------------------------------------------
create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  display_name  text not null,
  family_size   integer not null default 1,
  dietary_prefs jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

comment on table users is 'Profil applicatif MenuFamille — CDC 10.1';
comment on column users.dietary_prefs is 'Préférences et restrictions alimentaires (structure libre, ex. {"vegetarien": true, "allergies": ["arachide"]})';

-- ----------------------------------------------------------------------------
-- FAMILY_CIRCLES
-- ----------------------------------------------------------------------------
create table family_circles (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references users(id) on delete restrict,
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

comment on table family_circles is 'Cercle familial — porte la visibilité "circle" des recettes et le partage des plans de menu — CDC 5.4';
comment on column family_circles.invite_code is 'Code court partagé par WhatsApp, ex. FAM-7K2X';

-- on empêche la suppression d'un utilisateur créateur de cercle tant que le cercle existe
-- (restrict) : la suppression du cercle ou le transfert de propriété doit être un choix explicite,
-- jamais une suppression en cascade silencieuse d'un cercle familial entier.

-- ----------------------------------------------------------------------------
-- FAMILY_CIRCLE_MEMBERS
-- ----------------------------------------------------------------------------
create table family_circle_members (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references family_circles(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  role       circle_role_enum not null default 'membre',
  joined_at  timestamptz not null default now(),
  unique (circle_id, user_id)
);

comment on table family_circle_members is 'Appartenance d''un utilisateur à un cercle familial — CDC 5.4';

create index idx_family_circle_members_user on family_circle_members(user_id);
create index idx_family_circle_members_circle on family_circle_members(circle_id);
