-- ============================================================================
-- MenuFamille — Migration 0019 — member_dietary_prefs
-- ============================================================================
-- Preferences/restrictions alimentaires par personne (allergie, aversion,
-- preference, coup de coeur). Remplace users.dietary_prefs.allergies comme
-- source unique des allergies (dietary_prefs etait un placeholder Sprint 0
-- jamais editable en pratique — aucune UI d'ajout n'existait).
--
-- user_id (pas member_id -> family_circle_members) : une allergie est une
-- propriete de la PERSONNE, pas de son adhesion a un cercle precis. Sinon
-- quitter/rejoindre un cercle effacerait les allergies enregistrees (cascade
-- delete depuis family_circle_members), et une personne dans 2 cercles
-- devrait redeclarer la meme allergie deux fois.

create type pref_type_enum as enum ('allergy', 'dislike', 'preference', 'favorite');
create type severity_enum  as enum ('strict', 'light');

create table member_dietary_prefs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  pref_type   pref_type_enum not null,
  value       text not null,
  severity    severity_enum,
  created_at  timestamptz not null default now(),
  unique (user_id, pref_type, value),
  constraint chk_member_dietary_prefs_allergy_severity
    check (pref_type <> 'allergy' or severity is not null)
);

comment on table member_dietary_prefs is
  'Preferences/restrictions alimentaires par personne — remplace users.dietary_prefs.allergies. Cle sur user_id (la personne), pas sur family_circle_members (une adhesion a un cercle precis).';
comment on column member_dietary_prefs.severity is
  'Pertinent uniquement pour pref_type = allergy : strict (exclut en generation) vs light (informatif seulement).';

alter table member_dietary_prefs enable row level security;

-- SELECT : soi-meme, ou tout membre d'un cercle partage avec la personne
-- (necessaire pour que la planificatrice — ou n'importe quel co-membre —
-- voie les allergies des autres).
create policy member_dietary_prefs_select_shared_circle on member_dietary_prefs
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from family_circle_members mine
      where mine.user_id = auth.uid()
        and is_circle_member(mine.circle_id, member_dietary_prefs.user_id)
    )
  );

-- INSERT/DELETE : soi-meme, ou une planificatrice qui partage un cercle avec
-- la cible. Pas d'UPDATE expose (l'UI ajoute ou supprime, jamais n'edite en place).
create policy member_dietary_prefs_insert_self_or_planificatrice on member_dietary_prefs
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from family_circle_members mine
      where mine.user_id = auth.uid() and mine.role = 'planificatrice'
        and is_circle_member(mine.circle_id, member_dietary_prefs.user_id)
    )
  );

create policy member_dietary_prefs_delete_self_or_planificatrice on member_dietary_prefs
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from family_circle_members mine
      where mine.user_id = auth.uid() and mine.role = 'planificatrice'
        and is_circle_member(mine.circle_id, member_dietary_prefs.user_id)
    )
  );
