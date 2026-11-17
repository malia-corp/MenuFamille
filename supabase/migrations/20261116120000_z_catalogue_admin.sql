-- ============================================================================
-- Migration z — Catalogue KeskonBouf et rôle administrateur
-- (docs/catalogue-recettes.md, décision du 16 novembre 2026)
--
-- 1. users.app_role : « user » par défaut, « admin » pour le compte qui gère
--    le catalogue. Attribué uniquement en SQL (aucun écran ne le permet).
-- 2. recipes.is_official + recipes.rights : recette du catalogue KeskonBouf,
--    avec sa provenance (origine, auteur, licence, crédit photo). Une recette
--    officielle est toujours communautaire et a toujours sa provenance.
-- 3. Verrou : la RLS laisse chacun modifier sa ligne users et ses recettes
--    depuis le navigateur. Un déclencheur empêche ces accès directs
--    (rôles authenticated / anon) de toucher à ces colonnes : seules les
--    routes serveur (service role), après contrôle du rôle, les écrivent.
-- ============================================================================

alter table users
  add column app_role text not null default 'user'
  constraint chk_users_app_role check (app_role in ('user', 'admin'));

comment on column users.app_role is
  'user (défaut) / admin : gestion du catalogue KeskonBouf. Attribué en SQL uniquement, protégé par trg_users_protect_app_role.';

alter table recipes
  add column is_official boolean not null default false,
  add column rights jsonb,
  add constraint chk_recipes_official_published check (
    not is_official or (visibility = 'community' and rights is not null)
  );

comment on column recipes.is_official is
  'Recette du catalogue KeskonBouf, publiée par un compte admin. Toujours community, toujours avec rights.';
comment on column recipes.rights is
  'Provenance d''une recette du catalogue : {origin: maison|licence_libre|accord_auteur, author, license, inspired_by, photo_credit, checked_by, checked_at}.';

create index idx_recipes_official on recipes(is_official) where is_official;

-- ----------------------------------------------------------------------------
-- Verrous contre l'écriture directe depuis le navigateur
-- ----------------------------------------------------------------------------
create or replace function protect_users_app_role() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.app_role := 'user';
    else
      new.app_role := old.app_role;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_users_protect_app_role
  before insert or update on users
  for each row execute function protect_users_app_role();

create or replace function protect_recipes_official() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_official := false;
      new.rights := null;
    else
      new.is_official := old.is_official;
      new.rights := old.rights;
      -- Une recette du catalogue ne quitte la communauté que par le serveur.
      if old.is_official then
        new.visibility := old.visibility;
        new.circle_id := old.circle_id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_recipes_protect_official
  before insert or update on recipes
  for each row execute function protect_recipes_official();
