-- Missy — Supabase schema for synced history.
-- Run this once in your Supabase project's SQL Editor (Project → SQL Editor → New query).
--
-- Every synced table is owned per-row by the signed-in user (`user_id`,
-- enforced by RLS below) — see Settings → Cloud backup in the app to sign
-- in with a magic link. Signed out, the app works fully offline/local-only
-- and nothing is sent here at all.
--
-- (If you're upgrading an existing project that was set up before this
-- version — i.e. it still has the old fully-permissive policies — run
-- supabase/migrations/0001_auth_lockdown.sql instead, which adds user_id to
-- your existing rows without losing data. If you already ran 0001 but are
-- missing recurring_tasks/templates below, just run
-- supabase/migrations/0002_recurring_and_templates.sql.)

create table if not exists tasks (
  id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  time text,
  duration integer,
  priority text not null,
  category text not null,
  status text not null,
  date text not null,
  source text not null,
  recurrence text,
  recurring_template_id bigint,
  carried_from text,
  carry_count integer not null default 0,
  source_idea_id bigint,
  remind_me boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists ideas (
  id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  tag text not null,
  timestamp text not null,
  promoted_to_task_id bigint,
  updated_at timestamptz not null default now()
);

create table if not exists vocab (
  id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  meaning text,
  example text,
  date_learned text not null,
  ease_factor real not null default 2.5,
  interval integer not null default 0,
  repetitions integer not null default 0,
  due_date text,
  part_of_speech text,
  pronunciation text,
  updated_at timestamptz not null default now()
);

create table if not exists scores (
  date text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  tasks_completed integer,
  tasks_planned integer,
  ideas_logged integer,
  words_learned integer,
  updated_at timestamptz not null default now()
);

create table if not exists sleep (
  date text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bedtime text,
  wake_time text,
  hours numeric,
  quality integer,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists screen_time (
  date text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null,
  minutes integer not null,
  alerted_at text,
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists recurring_tasks (
  id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  time text,
  duration integer,
  priority text not null,
  category text not null,
  recurrence text not null,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists templates (
  id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tasks jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists weekly_reviews (
  week_start text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ai jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists ideas_user_id_idx on ideas(user_id);
create index if not exists vocab_user_id_idx on vocab(user_id);
create index if not exists scores_user_id_idx on scores(user_id);
create index if not exists sleep_user_id_idx on sleep(user_id);
create index if not exists screen_time_user_id_idx on screen_time(user_id);
create index if not exists app_settings_user_id_idx on app_settings(user_id);
create index if not exists recurring_tasks_user_id_idx on recurring_tasks(user_id);
create index if not exists templates_user_id_idx on templates(user_id);
create index if not exists weekly_reviews_user_id_idx on weekly_reviews(user_id);

alter table tasks enable row level security;
alter table ideas enable row level security;
alter table vocab enable row level security;
alter table scores enable row level security;
alter table sleep enable row level security;
alter table screen_time enable row level security;
alter table app_settings enable row level security;
alter table recurring_tasks enable row level security;
alter table templates enable row level security;
alter table weekly_reviews enable row level security;

create policy "select own" on tasks for select using (auth.uid() = user_id);
create policy "insert own" on tasks for insert with check (auth.uid() = user_id);
create policy "update own" on tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on tasks for delete using (auth.uid() = user_id);

create policy "select own" on ideas for select using (auth.uid() = user_id);
create policy "insert own" on ideas for insert with check (auth.uid() = user_id);
create policy "update own" on ideas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on ideas for delete using (auth.uid() = user_id);

create policy "select own" on vocab for select using (auth.uid() = user_id);
create policy "insert own" on vocab for insert with check (auth.uid() = user_id);
create policy "update own" on vocab for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on vocab for delete using (auth.uid() = user_id);

create policy "select own" on scores for select using (auth.uid() = user_id);
create policy "insert own" on scores for insert with check (auth.uid() = user_id);
create policy "update own" on scores for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on scores for delete using (auth.uid() = user_id);

create policy "select own" on sleep for select using (auth.uid() = user_id);
create policy "insert own" on sleep for insert with check (auth.uid() = user_id);
create policy "update own" on sleep for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on sleep for delete using (auth.uid() = user_id);

create policy "select own" on screen_time for select using (auth.uid() = user_id);
create policy "insert own" on screen_time for insert with check (auth.uid() = user_id);
create policy "update own" on screen_time for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on screen_time for delete using (auth.uid() = user_id);

create policy "select own" on app_settings for select using (auth.uid() = user_id);
create policy "insert own" on app_settings for insert with check (auth.uid() = user_id);
create policy "update own" on app_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on app_settings for delete using (auth.uid() = user_id);

create policy "select own" on recurring_tasks for select using (auth.uid() = user_id);
create policy "insert own" on recurring_tasks for insert with check (auth.uid() = user_id);
create policy "update own" on recurring_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on recurring_tasks for delete using (auth.uid() = user_id);

create policy "select own" on templates for select using (auth.uid() = user_id);
create policy "insert own" on templates for insert with check (auth.uid() = user_id);
create policy "update own" on templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on templates for delete using (auth.uid() = user_id);

create policy "select own" on weekly_reviews for select using (auth.uid() = user_id);
create policy "insert own" on weekly_reviews for insert with check (auth.uid() = user_id);
create policy "update own" on weekly_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on weekly_reviews for delete using (auth.uid() = user_id);
