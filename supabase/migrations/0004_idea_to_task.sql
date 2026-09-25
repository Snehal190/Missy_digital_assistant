-- Missy — Phase 2 #8: promote ideas to tasks.
-- Run once in the SQL Editor. Safe to run regardless of which prior
-- migrations have already been applied.

alter table tasks add column if not exists source_idea_id bigint;
alter table ideas add column if not exists promoted_to_task_id bigint;
