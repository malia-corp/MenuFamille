-- ============================================================================
-- Migration y — Import de recettes v2 : tentatives d'import et traçabilité
-- (docs/import-recettes.md, décisions des 27-28 octobre 2026)
--
-- 1. recipe_import_attempts : une ligne par import lancé, réussi ou non.
--    Sert de cache (même page, même version du parseur), de compteur de quota
--    par utilisatrice (imports avec IA du jour), de plafond global (coût du
--    mois) et de journal des coûts. Écrite uniquement côté serveur (service
--    role) ; chacune ne lit que ses propres lignes.
-- 2. recipe_imports : source, statut et temps de repos de l'import retenu.
-- ============================================================================

create table recipe_import_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  input_kind      text not null check (input_kind in ('url', 'text')),
  source_url      text,
  content_hash    text not null,          -- sha256 tronqué du HTML ou du texte collé
  parser_version  text not null,
  status          text not null check (status in ('complete', 'partial', 'failed')),
  error_code      text,                    -- invalid_url, blocked, robots_disallowed, timeout…
  source_type     text[] not null default '{}',
  used_llm        boolean not null default false,
  llm_model       text,
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  cost_usd        numeric(10,6) not null default 0,
  result          jsonb,                   -- ImportResult, réutilisé comme cache
  created_at      timestamptz not null default now()
);

comment on table recipe_import_attempts is 'Import de recettes v2 : cache, quota IA par utilisatrice, plafond mensuel, journal des coûts — migration y';

-- Quota du jour d'une utilisatrice
create index idx_import_attempts_user_day on recipe_import_attempts(user_id, created_at desc) where used_llm;
-- Cache : même contenu, même version
create index idx_import_attempts_cache on recipe_import_attempts(content_hash, parser_version, created_at desc) where status <> 'failed';
-- Coût du mois
create index idx_import_attempts_llm_month on recipe_import_attempts(created_at) where used_llm;

alter table recipe_import_attempts enable row level security;

create policy recipe_import_attempts_select_own on recipe_import_attempts
  for select using (user_id = auth.uid());

-- Traçabilité de l'import retenu à l'enregistrement
alter table recipe_imports
  add column source_type text[] not null default '{}',
  add column status      text check (status in ('complete', 'partial', 'failed')),
  add column rest_min    integer;

comment on column recipe_imports.rest_min is 'Temps de repos lu sur la page, déjà compris dans recipes.prep_time_min ; gardé pour les rappels « à préparer la veille » (backlog)';
