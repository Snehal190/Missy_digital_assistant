-- Missy — Phase 2 #2: recurring task templates + routine templates.
-- Run once in the SQL Editor. Safe to run whether or not you've already
-- applied 0001_auth_lockdown.sql (it creates these two new tables with the
-- same per-user RLS pattern either way).

alter table tasks add column if not exists recurrence text;
alter table tasks add column if not exists recurring_template_id bigint;

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

create index if not exists recurring_tasks_user_id_idx on recurring_tasks(user_id);
create index if not exists templates_user_id_idx on templates(user_id);

alter table recurring_tasks enable row level security;
alter table templates enable row level security;

create policy "select own" on recurring_tasks for select using (auth.uid() = user_id);
create policy "insert own" on recurring_tasks for insert with check (auth.uid() = user_id);
create policy "update own" on recurring_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on recurring_tasks for delete using (auth.uid() = user_id);

create policy "select own" on templates for select using (auth.uid() = user_id);
create policy "insert own" on templates for insert with check (auth.uid() = user_id);
create policy "update own" on templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on templates for delete using (auth.uid() = user_id);
