import { supabase } from "./supabaseClient";
import { enqueue } from "./syncQueue";
import { getCurrentUserId } from "./auth";

// One-way sync: local Dexie is always the source of truth for the running
// app; every write also gets queued here as a durable cloud copy of your
// history (see syncQueue.js for the actual retry/backoff engine). Enqueueing
// never throws and never blocks the caller — a failed/offline sync just
// means that write sits in the queue until it can go through.
//
// Signed out = local-only: every function here no-ops (doesn't even enqueue)
// if there's no authenticated user, since RLS would reject the write anyway
// and there's no point building up a doomed queue. `user_id` is attached
// automatically on every upsert — never pass it from a component/repo.
//
// DO NOT call syncUpsert/syncDeleteByIds/syncDeleteByKey for the private
// journal ("journal" / "journalMeta" tables), ever — not for a new feature,
// not for a "force full resync" action, not for anything. The journal is
// local-only and encrypted-at-rest specifically so it never leaves this
// device; wiring it into this file would silently defeat that. Its own
// repository (src/db/journalRepository.js) is intentionally the only thing
// that touches those tables, and it never imports this module.

export async function syncUpsert(table, row, keyColumn) {
  if (!supabase) return;
  const userId = getCurrentUserId();
  if (!userId) return; // signed out — stay local-only
  const payload = { ...row, user_id: userId };
  const key = keyColumn || ("id" in row ? "id" : "date");
  await enqueue({ table, operation: "upsert", recordId: payload[key], keyColumn: key, payload });
}

export async function syncDeleteByIds(table, ids) {
  if (!supabase || !ids || ids.length === 0) return;
  if (!getCurrentUserId()) return; // signed out — stay local-only
  for (const id of ids) {
    await enqueue({ table, operation: "delete", recordId: id, keyColumn: "id" });
  }
}

export async function syncDeleteByKey(table, keyColumn, keyValue) {
  if (!supabase) return;
  if (!getCurrentUserId()) return; // signed out — stay local-only
  await enqueue({ table, operation: "delete", recordId: keyValue, keyColumn });
}

// Row shape mappers — Dexie objects use camelCase; Supabase columns are
// snake_case. Keep these next to the schema in supabase/schema.sql.
export const toTaskRow = (t) => ({
  id: t.id,
  title: t.title,
  time: t.time,
  duration: t.duration,
  priority: t.priority,
  category: t.category,
  status: t.status,
  date: t.date,
  source: t.source,
  recurrence: t.recurrence ?? null,
  recurring_template_id: t.recurringTemplateId ?? null,
  carried_from: t.carriedFrom ?? null,
  carry_count: t.carryCount ?? 0,
  source_idea_id: t.sourceIdeaId ?? null,
  remind_me: t.remindMe ?? false,
});

export const toIdeaRow = (i) => ({
  id: i.id,
  text: i.text,
  tag: i.tag,
  timestamp: i.timestamp,
  promoted_to_task_id: i.promotedToTaskId ?? null,
});

export const toVocabRow = (v) => ({
  id: v.id,
  word: v.word,
  meaning: v.meaning,
  example: v.example,
  date_learned: v.dateLearned,
  ease_factor: v.easeFactor ?? 2.5,
  interval: v.interval ?? 0,
  repetitions: v.repetitions ?? 0,
  due_date: v.dueDate ?? v.dateLearned,
  part_of_speech: v.partOfSpeech ?? null,
  pronunciation: v.pronunciation ?? null,
});

export const toScoreRow = (date, s) => ({
  date,
  score: s.score,
  tasks_completed: s.tasksCompleted,
  tasks_planned: s.tasksPlanned,
  ideas_logged: s.ideasLogged,
  words_learned: s.wordsLearned,
});

export const toSleepRow = (date, s) => ({
  date,
  bedtime: s.bedtime,
  wake_time: s.wakeTime,
  hours: s.hours,
  quality: s.quality,
  notes: s.notes,
});

export const toScreenTimeRow = (row) => ({
  date: row.date,
  app: row.app,
  minutes: row.minutes,
  alerted_at: row.alertedAt,
});

export const toSettingsRow = (id, data) => ({ id, data });

export const toRecurringTaskRow = (r) => ({
  id: r.id,
  title: r.title,
  time: r.time,
  duration: r.duration,
  priority: r.priority,
  category: r.category,
  recurrence: r.recurrence,
  paused: r.paused,
});

export const toTemplateRow = (t) => ({
  id: t.id,
  name: t.name,
  tasks: t.tasks,
});

export const toWeeklyReviewRow = (w) => ({
  week_start: w.weekStart,
  ai: w.ai,
});
