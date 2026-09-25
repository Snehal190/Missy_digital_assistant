-- Missy — Phase 2 #10: per-user ownership + RLS lockdown.
--
-- Why: the original schema.sql enabled RLS but used fully permissive
-- policies ("allow anon all"). That means anyone who extracts the
-- publishable key from the client bundle — trivial, it's meant to be
-- public — could read and write your entire history. This migration adds
-- a user_id column to every synced table and replaces those policies with
-- ones scoped to `auth.uid() = user_id`, so only your signed-in session can
-- touch your rows.
--
-- HOW TO RUN THIS (one time):
-- 1. Sign in to the app once first: Settings → Cloud backup → enter your
--    email → click the magic link Supabase emails you. That creates your
--    auth user.
-- 2. Find your user id: Supabase Dashboard → Authentication → Users →
--    copy the UUID shown next to your email.
-- 3. Replace every YOUR_USER_ID_HERE below with that UUID (find/replace
--    all — there are 7, one per table), then run this whole file in the
--    SQL Editor.
--
-- The private journal is NEVER part of this — it has no Supabase table at
-- all, on any account.

-- 1. Add the column (nullable for now, so existing rows aren't rejected
--    until they're backfilled below).
alter table tasks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table ideas add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table vocab add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table scores add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table sleep add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table screen_time add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table app_settings add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2. Backfill existing rows with your user id.
update tasks set user_id = 'YOUR_USER_ID_HERE' where user_id is null;
update ideas set user_id = 'YOUR_USER_ID_HERE' where user_id is null;
update vocab set user_id = 'YOUR_USER_ID_HERE' where user_id is null;
update scores set user_id = 'YOUR_USER_ID_HERE' where user_id is null;
update sleep set user_id = 'YOUR_USER_ID_HERE' where user_id is null;
update screen_time set user_id = 'YOUR_USER_ID_HERE' where user_id is null;
update app_settings set user_id = 'YOUR_USER_ID_HERE' where user_id is null;

-- 3. Require it going forward.
alter table tasks alter column user_id set not null;
alter table ideas alter column user_id set not null;
alter table vocab alter column user_id set not null;
alter table scores alter column user_id set not null;
alter table sleep alter column user_id set not null;
alter table screen_time alter column user_id set not null;
alter table app_settings alter column user_id set not null;

-- 4. Indexes for RLS filtering.
create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists ideas_user_id_idx on ideas(user_id);
create index if not exists vocab_user_id_idx on vocab(user_id);
create index if not exists scores_user_id_idx on scores(user_id);
create index if not exists sleep_user_id_idx on sleep(user_id);
create index if not exists screen_time_user_id_idx on screen_time(user_id);
create index if not exists app_settings_user_id_idx on app_settings(user_id);

-- 5. Swap the permissive policies for per-user ones.
drop policy if exists "allow anon all" on tasks;
drop policy if exists "allow anon all" on ideas;
drop policy if exists "allow anon all" on vocab;
drop policy if exists "allow anon all" on scores;
drop policy if exists "allow anon all" on sleep;
drop policy if exists "allow anon all" on screen_time;
drop policy if exists "allow anon all" on app_settings;

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
