-- ============================================================================
-- MenuFamille — Migration 0016 — recipe_associations
-- ============================================================================
-- Remplace recipe_type : l'accompagnement n'est pas une propriete intrinseque
-- d'une recette, c'est une relation contextuelle apprise depuis l'usage reel
-- (planification + formulaire recette), personnelle ET agregee au niveau
-- communaute pour la personnalisation des suggestions.
--
-- user_id est NOT NULL : chaque ligne est personnelle. Il n'existe pas de
-- ligne "communaute" mutable (piege Postgres : NULL <> NULL dans une
-- contrainte UNIQUE empeche ON CONFLICT de jamais matcher de telles lignes).
-- Le signal communautaire se calcule a la lecture, via la fonction
-- recipe_association_suggestions ci-dessous, jamais par une ligne dediee.

create table recipe_associations (
  id                    uuid primary key default gen_random_uuid(),
  recipe_id             uuid not null references recipes(id) on delete cascade,
  associated_recipe_id  uuid not null references recipes(id) on delete cascade,
  role                  text not null check (role in ('side', 'drink')),
  frequency             integer not null default 1,
  user_id               uuid not null references users(id) on delete cascade,
  source                text not null check (source in ('planning', 'recipe_form')),
  last_used_at          timestamptz not null default now(),

  constraint chk_recipe_associations_not_self check (recipe_id <> associated_recipe_id),
  unique (recipe_id, associated_recipe_id, role, user_id)
);

comment on table recipe_associations is
  'Historique personnel des associations plat/accompagnement et plat/boisson — remplace recipe_type. Une ligne par utilisateur ; l''agregat communautaire se calcule a la lecture via recipe_association_suggestions().';
comment on column recipe_associations.role is 'side = accompagnement, drink = boisson';

create index idx_recipe_associations_lookup     on recipe_associations (recipe_id, role, user_id);
create index idx_recipe_associations_associated on recipe_associations (associated_recipe_id);

alter table recipe_associations enable row level security;

-- Une seule policy : chacun ne voit/ecrit que ses propres lignes. Tout acces
-- croisé passe exclusivement par la fonction SECURITY DEFINER ci-dessous,
-- jamais par une policy large sur la table de base (cf. postmortem
-- meal_compositions_shared_select, migration 20260920000015_o).
create policy recipe_associations_owner_only on recipe_associations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Fonction d'agrégation sécurisée
-- ----------------------------------------------------------------------------
-- Combine frequence personnelle (ponderee x2) et frequence communautaire
-- (somme sur tous les utilisateurs), sans jamais exposer qui a fait quoi.
--
-- Deux verifications de visibilite sont necessaires, pas une seule :
--   1. la recette source (p_recipe_id) doit etre visible par l'appelant,
--      sinon la fonction ne renvoie rien du tout ;
--   2. CHAQUE recette candidate (associated_recipe_id) doit ETRE VISIBLE
--      INDIVIDUELLEMENT par l'appelant — sinon une recette privee d'un tiers
--      associee a une recette communautaire fuiterait comme suggestion des
--      qu'un autre utilisateur consulte cette recette communautaire.
create or replace function recipe_association_suggestions(
  p_recipe_id uuid,
  p_role      text,
  p_limit     integer default 4
)
returns table (associated_recipe_id uuid, score numeric)
language sql stable security definer set search_path = public
as $$
  select
    ra.associated_recipe_id,
    sum(case when ra.user_id = auth.uid() then ra.frequency * 2 else ra.frequency end)::numeric as score
  from recipe_associations ra
  where ra.recipe_id = p_recipe_id
    and ra.role = p_role
    and exists (
      select 1 from recipes r where r.id = p_recipe_id
        and (r.visibility = 'community' or r.user_id = auth.uid()
             or (r.visibility = 'circle' and r.circle_id is not null and is_circle_member(r.circle_id, auth.uid())))
    )
    and exists (
      select 1 from recipes ar where ar.id = ra.associated_recipe_id
        and (ar.visibility = 'community' or ar.user_id = auth.uid()
             or (ar.visibility = 'circle' and ar.circle_id is not null and is_circle_member(ar.circle_id, auth.uid())))
    )
  group by ra.associated_recipe_id
  order by score desc
  limit p_limit;
$$;

revoke all on function recipe_association_suggestions(uuid, text, integer) from public;
grant execute on function recipe_association_suggestions(uuid, text, integer) to authenticated;
