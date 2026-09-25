-- Missy — Phase 2 #9: task reminders.
-- Run once in the SQL Editor. Safe to run regardless of which prior
-- migrations have already been applied.

alter table tasks add column if not exists remind_me boolean not null default false;
