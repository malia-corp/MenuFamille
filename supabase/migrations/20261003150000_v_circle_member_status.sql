-- Statut d'un membre dans un cercle, géré par la planificatrice
-- (PATCH /api/circles/:id/members/:userId, client service après contrôle du
-- rôle). Un membre désactivé reste dans le cercle et garde son historique
-- (ses votes, ses avis), mais ne voit plus les autres membres, ni le menu de
-- la semaine, et ne peut plus voter ni donner d'avis — ces deux derniers
-- points sont contrôlés côté API (lib/utils/circle-access.ts).

alter table family_circle_members
  add column is_active boolean not null default true;

-- Appartenance active (security definer, même principe que is_circle_member).
create or replace function is_active_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from family_circle_members
    where circle_id = p_circle_id and user_id = p_user_id and is_active
  );
$$ language sql stable security definer;

-- Liste des membres : sa propre ligne toujours ; celles des autres
-- seulement si l'on est membre actif du cercle.
drop policy circle_members_select_same_circle on family_circle_members;
create policy circle_members_select_same_circle on family_circle_members
  for select using (
    user_id = auth.uid()
    or is_active_circle_member(circle_id, auth.uid())
  );

-- Profils des autres membres : seulement via un cercle où l'on est actif.
drop policy users_select_circle_mates on users;
create policy users_select_circle_mates on users
  for select using (
    exists (
      select 1
      from family_circle_members mine
      where mine.user_id = auth.uid()
        and mine.is_active
        and is_circle_member(mine.circle_id, users.id)
    )
  );

-- Préférences alimentaires des autres membres : idem.
drop policy member_dietary_prefs_select_shared_circle on member_dietary_prefs;
create policy member_dietary_prefs_select_shared_circle on member_dietary_prefs
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from family_circle_members mine
      where mine.user_id = auth.uid()
        and mine.is_active
        and is_circle_member(mine.circle_id, member_dietary_prefs.user_id)
    )
  );
