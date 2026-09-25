-- Missy — Phase 2 #3: carry-over of unfinished tasks.
-- Run once in the SQL Editor. Safe to run regardless of which prior
-- migrations have already been applied.

alter table tasks add column if not exists carried_from text;
alter table tasks add column if not exists carry_count integer not null default 0;
