-- Migration 0009 — Champ preferences JSONB sur users
-- Stocke les préférences applicatives extensibles (auth_mode, etc.)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN users.preferences IS
  'Préférences applicatives (structure libre, ex. {"auth_mode": "link"})';
