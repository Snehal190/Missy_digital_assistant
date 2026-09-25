-- Missy — Phase 2 #6: weekly review.
-- Run once in the SQL Editor. Safe to run regardless of which prior
-- migrations have already been applied.

create table if not exists weekly_reviews (
  week_start text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ai jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists weekly_reviews_user_id_idx on weekly_reviews(user_id);

alter table weekly_reviews enable row level security;

create policy "select own" on weekly_reviews for select using (auth.uid() = user_id);
create policy "insert own" on weekly_reviews for insert with check (auth.uid() = user_id);
create policy "update own" on weekly_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on weekly_reviews for delete using (auth.uid() = user_id);
