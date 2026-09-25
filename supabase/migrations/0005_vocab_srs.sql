-- Missy — Phase 2 #5: spaced repetition for vocabulary.
-- Run once in the SQL Editor. Safe to run regardless of which prior
-- migrations have already been applied.

alter table vocab add column if not exists ease_factor real not null default 2.5;
alter table vocab add column if not exists interval integer not null default 0;
alter table vocab add column if not exists repetitions integer not null default 0;
alter table vocab add column if not exists due_date text;
alter table vocab add column if not exists part_of_speech text;
alter table vocab add column if not exists pronunciation text;
