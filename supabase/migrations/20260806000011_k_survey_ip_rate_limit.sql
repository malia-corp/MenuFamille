-- Ajoute ip_address sur survey_responses pour le rate limiting (10 réponses/IP/heure)
alter table survey_responses add column if not exists ip_address text;
