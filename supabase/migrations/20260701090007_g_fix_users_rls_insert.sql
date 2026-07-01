-- Policy manquante dans 0006 : l'utilisateur peut insérer sa propre ligne de profil
-- Sans cette policy, l'INSERT dans auth/callback était silencieusement bloqué par RLS.
create policy users_insert_self on users
  for insert with check (id = auth.uid());
