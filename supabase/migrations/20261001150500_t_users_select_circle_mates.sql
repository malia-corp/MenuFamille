-- users_select_self (id = auth.uid()) ne laissait un membre voir que son
-- propre profil. GET /api/circles joint family_circle_members -> users
-- avec le client de session : des qu'un cercle a 2+ membres, chaque membre
-- voit son propre profil mais celui des autres revient null, ce qui fait
-- planter app/(app)/circle/page.tsx (u.display_name sur u = null).
--
-- Meme pattern deja en place pour member_dietary_prefs (cf.
-- 20260930000019_s_member_dietary_prefs.sql) : un membre doit pouvoir lire
-- le profil de quiconque partage un cercle avec lui, pas seulement le sien.
create policy users_select_circle_mates on users
  for select using (
    exists (
      select 1
      from family_circle_members mine
      where mine.user_id = auth.uid()
        and is_circle_member(mine.circle_id, users.id)
    )
  );
