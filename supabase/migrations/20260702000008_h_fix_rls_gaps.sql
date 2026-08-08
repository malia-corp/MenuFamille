-- Migration 0008 — Garantir les policies INSERT critiques (idempotent)
--
-- Problème : si les tables ont été créées manuellement via Supabase Studio avant
-- le premier supabase db push, la migration 0006 peut avoir été interrompue :
-- RLS activé sur les tables MAIS policies absentes → tout INSERT bloqué par défaut.
--
-- Solution : DROP IF EXISTS + CREATE pour chaque policy INSERT clé.

-- family_circles
DROP POLICY IF EXISTS circles_insert_self ON family_circles;
CREATE POLICY circles_insert_self ON family_circles
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- family_circle_members
DROP POLICY IF EXISTS circle_members_insert_self ON family_circle_members;
CREATE POLICY circle_members_insert_self ON family_circle_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- users
DROP POLICY IF EXISTS users_insert_self ON users;
CREATE POLICY users_insert_self ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- user_meal_config (FOR ALL de 0006 couvre INSERT via USING=WITH CHECK,
-- mais on le rend explicite pour lever toute ambiguïté)
DROP POLICY IF EXISTS user_meal_config_insert_self ON user_meal_config;
CREATE POLICY user_meal_config_insert_self ON user_meal_config
  FOR INSERT WITH CHECK (user_id = auth.uid());
