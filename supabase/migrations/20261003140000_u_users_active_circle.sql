-- Cercle actif : le cercle affiché dans l'app (page cercle, en-tête, accueil,
-- profil) pour une utilisatrice membre de plusieurs cercles. NULL = le
-- premier cercle rejoint (comportement historique, cf.
-- docs/ecarts-implementation.md #1).
--
-- Choisi via PUT /api/circles/active, qui vérifie l'appartenance au cercle.
-- La policy users_update_self couvre déjà la mise à jour de sa propre ligne.
-- Supprimer le cercle remet la valeur à NULL (on delete set null) ; après un
-- départ du cercle, la lecture (lib/utils/active-circle.ts) ignore un cercle
-- dont on n'est plus membre et retombe sur le premier rejoint.

alter table users
  add column active_circle_id uuid references family_circles(id) on delete set null;
