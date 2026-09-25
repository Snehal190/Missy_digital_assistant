import Dexie from "dexie";

export const db = new Dexie("missy");

db.version(1).stores({
  tasks: "++id, date, status, priority, category",
  ideas: "++id, timestamp, tag",
  vocab: "++id, dateLearned, word",
  scores: "date",
  settings: "id",
});

db.version(2).stores({
  sleep: "date",
  screenTime: "date",
});

// Private journal. Deliberately isolated from every other table: no other
// module should import `db.journal` / `db.journalMeta` directly — go through
// src/db/journalRepository.js, which is the only place that (a) knows how to
// decrypt entries and (b) is guaranteed to never call the Supabase sync layer
// or any AI endpoint. See journalRepository.js for the full rationale.
db.version(3).stores({
  journal: "++id, createdAt",
  journalMeta: "id",
});

// Durable outbox for Supabase writes — see src/db/syncQueue.js. One pending
// row per (table, recordId) at most; the journal must never appear here.
db.version(4).stores({
  syncQueue: "++id, table, recordId, createdAt, [table+recordId]",
});

// recurringTasks: templates that get materialised into `tasks` each day
// (see repository.js's materializeRecurringTasksIfNeeded) — never task
// instances themselves. templates: named bundles of tasks ("Deep work
// day") applied on demand. `tasks` itself gains two unindexed fields,
// `recurrence` and `recurringTemplateId`, which Dexie doesn't require a
// schema entry for since nothing queries by them.
db.version(5).stores({
  recurringTasks: "++id",
  templates: "++id, createdAt",
});

// Cached weekly reviews (see src/lib/weeklyReview.js + Review.jsx's "Weekly"
// tab), keyed by the week's Monday. Only the AI-generated section is stored
// here — the local stats are cheap to recompute on demand so they always
// reflect the latest data instead of going stale.
db.version(6).stores({
  weeklyReviews: "weekStart",
});

// Credentials vault. Deliberately isolated exactly like the private journal
// (see the version(3) comment above): local-only, own encryption, own
// unlock — no other module should import `db.vault` / `db.vaultMeta`
// directly, go through src/db/vaultRepository.js. Never wired into
// supabaseSync.js.
db.version(7).stores({
  vault: "++id, createdAt",
  vaultMeta: "id",
});

export default db;
