-- ============================================================================
-- MenuFamille — Migration 0004 — Sondage & feedback
-- Domaine CDC v3.0 — section 10.4
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type survey_reaction_enum as enum ('aime', 'bof', 'naime_pas');
create type notification_channel_enum as enum ('push', 'in_app');
create type feedback_rating_enum as enum ('excellent', 'correct', 'decevant');

-- ----------------------------------------------------------------------------
-- SURVEY_RESPONSES  (remplace VOTES de la v2.0)
-- ----------------------------------------------------------------------------
create table survey_responses (
  id               uuid primary key default gen_random_uuid(),
  meal_plan_id     uuid not null references meal_plans(id) on delete cascade,
  user_id          uuid references users(id) on delete set null,
  respondent_name  text not null,
  created_at       timestamptz not null default now()
);

comment on table survey_responses is 'Réponse d''un répondant au sondage famille d''un plan de menu — CDC 5.8, 10.4';
comment on column survey_responses.respondent_name is 'Prénom déclaré, indicatif et non vérifié — pas une identité authentifiée si user_id est NULL';

create index idx_survey_responses_plan on survey_responses(meal_plan_id);

-- ----------------------------------------------------------------------------
-- SURVEY_ANSWERS
-- ----------------------------------------------------------------------------
create table survey_answers (
  id                   uuid primary key default gen_random_uuid(),
  response_id          uuid not null references survey_responses(id) on delete cascade,
  meal_plan_item_id    uuid not null references meal_plan_items(id) on delete cascade,
  reaction             survey_reaction_enum not null,
  comment              text,
  unique (response_id, meal_plan_item_id)
);

comment on table survey_answers is 'Réaction nuancée à un repas précis du sondage — CDC 5.8, 10.4';

create index idx_survey_answers_response on survey_answers(response_id);
create index idx_survey_answers_item on survey_answers(meal_plan_item_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATION_PREFS
-- ----------------------------------------------------------------------------
create table notification_prefs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  meal_type           meal_type_enum not null,
  reminder_enabled    boolean not null default false,
  reminder_time       time,
  days_of_week        integer[] not null default '{1,2,3,4,5,6,7}',
  feedback_enabled    boolean not null default false,
  feedback_delay_min  integer not null default 120,
  channel             notification_channel_enum not null default 'push',
  unique (user_id, meal_type)
);

comment on table notification_prefs is 'Préférences de rappel et de demande de feedback, par type de repas — CDC 5.9, 10.4';
comment on column notification_prefs.days_of_week is 'Jours concernés, 1=lundi … 7=dimanche';
comment on column notification_prefs.feedback_delay_min is 'Délai après l''heure du repas avant la demande de feedback, par défaut 120 minutes';

create index idx_notification_prefs_user on notification_prefs(user_id);

-- ----------------------------------------------------------------------------
-- FEEDBACK_TEMPLATES
-- ----------------------------------------------------------------------------
create table feedback_templates (
  id         uuid primary key default gen_random_uuid(),
  category   feedback_rating_enum not null,
  message    text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

comment on table feedback_templates is 'Messages prêts ("vibe messages") proposés selon la note du repas — CDC 5.10, 10.4 — administrable sans redéploiement';

create index idx_feedback_templates_category on feedback_templates(category) where is_active;

-- ----------------------------------------------------------------------------
-- MEAL_FEEDBACK
-- ----------------------------------------------------------------------------
create table meal_feedback (
  id                  uuid primary key default gen_random_uuid(),
  meal_plan_item_id   uuid not null references meal_plan_items(id) on delete cascade,
  user_id             uuid references users(id) on delete set null,
  respondent_name     text not null,
  rating              feedback_rating_enum not null,
  template_id         uuid references feedback_templates(id) on delete set null,
  custom_message      text,
  is_public           boolean not null default true,
  created_at          timestamptz not null default now()
);

comment on table meal_feedback is 'Retour sur un repas réellement vécu (onglet Avis) — CDC 5.10, 10.4';

create index idx_meal_feedback_item on meal_feedback(meal_plan_item_id);
create index idx_meal_feedback_user on meal_feedback(user_id);
