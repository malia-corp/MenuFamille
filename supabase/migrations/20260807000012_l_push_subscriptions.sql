-- ============================================================================
-- MenuFamille — Migration 0012 — Push subscriptions
-- ============================================================================

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_sub_owner" on push_subscriptions
  for all using (user_id = auth.uid());
