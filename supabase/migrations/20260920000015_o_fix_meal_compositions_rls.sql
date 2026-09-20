-- Retire meal_compositions_shared_select : cette policy autorisait la lecture
-- des compositions de n'importe quel plan deja partage (share_token is not null)
-- par n'importe quel role, y compris anon, sans jamais verifier token_expires_at
-- ni presenter le token. Contraire au pattern documente (f_rls_policies.sql) :
-- l'acces public via share_token doit passer uniquement par un endpoint
-- service-role cote serveur qui valide le token et son expiration.
-- Aucun code applicatif ne s'appuie sur cette policy (la page /s/[token] et
-- /api/surveys/* utilisent deja createServiceClient(), qui contourne RLS).

drop policy if exists meal_compositions_shared_select on meal_compositions;
