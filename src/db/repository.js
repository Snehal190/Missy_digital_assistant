// Data access layer. UI code should only ever talk to these repo objects,
// never to `db` directly. Local Dexie/IndexedDB is the source of truth the
// app reads from; every mutation also best-effort syncs to Supabase (if
// configured — see src/db/supabaseSync.js) as a durable cloud history log.
import { db } from "./db";
import { SETTINGS_ID, DEFAULT_SETTINGS, SCREEN_TIME_APP } from "../config/constants";
import { todayStr, localDateFromISO, addDaysToStr } from "../lib/dates";
import { computeSleepHours } from "../lib/sleep";
import { isDueOn } from "../lib/recurrence";
import { computeStreak } from "../lib/streaks";
import { defaultSrsFields, nextSrsState } from "../lib/srs";
import { weekDates } from "../lib/weeklyReview";
import {
  syncUpsert,
  syncDeleteByIds,
  syncDeleteByKey,
  toTaskRow,
  toIdeaRow,
  toVocabRow,
  toScoreRow,
  toSleepRow,
  toScreenTimeRow,
  toSettingsRow,
  toRecurringTaskRow,
  toTemplateRow,
  toWeeklyReviewRow,
} from "./supabaseSync";

export const tasksRepo = {
  async listByDate(date) {
    const tasks = await db.tasks.where("date").equals(date).toArray();
    return tasks.sort((a, b) => {
      if (!a.time && !b.time) return a.id - b.id;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  },
  async get(id) {
    return db.tasks.get(id);
  },
  async create(task) {
    const row = {
      title: "",
      time: null,
      duration: null,
      priority: "Medium",
      category: "Personal",
      status: "Not started",
      date: todayStr(),
      source: "manual",
      ...task,
    };
    const id = await db.tasks.add(row);
    syncUpsert("tasks", toTaskRow({ ...row, id }));
    return id;
  },
  async createMany(tasks) {
    const ids = await db.tasks.bulkAdd(tasks, { allKeys: true });
    tasks.forEach((task, i) => syncUpsert("tasks", toTaskRow({ ...task, id: ids[i] })));
    return ids;
  },
  async update(id, changes) {
    await db.tasks.update(id, changes);
    const row = await db.tasks.get(id);
    if (row) syncUpsert("tasks", toTaskRow(row));
  },
  async remove(id) {
    await db.tasks.delete(id);
    syncDeleteByIds("tasks", [id]);
  },
  async removeByDate(date) {
    const ids = await db.tasks.where("date").equals(date).primaryKeys();
    await db.tasks.bulkDelete(ids);
    syncDeleteByIds("tasks", ids);
  },
  // End-of-day carry-over: leaves the original row untouched (it stays an
  // honest record that this task wasn't finished that day) and creates a
  // fresh row on tomorrow's date carrying the same fields forward, plus
  // `carriedFrom`/`carryCount` for the "Nth day" UI nudge.
  async carryToTomorrow(task) {
    const tomorrow = addDaysToStr(task.date, 1);
    return tasksRepo.create({
      title: task.title,
      time: task.time,
      duration: task.duration,
      priority: task.priority,
      category: task.category,
      status: "Not started",
      date: tomorrow,
      source: task.source,
      recurrence: task.recurrence ?? null,
      recurringTemplateId: task.recurringTemplateId ?? null,
      carriedFrom: task.date,
      carryCount: (task.carryCount || 0) + 1,
    });
  },
};

// Templates for recurring tasks — rows here are never shown on Today
// directly; materializeRecurringTasksIfNeeded() turns due ones into real
// `tasks` rows each day. Editing/pausing/deleting a template never touches
// already-materialized task instances (those live independently in `tasks`).
export const recurringTasksRepo = {
  async list() {
    return db.recurringTasks.orderBy("id").toArray();
  },
  async create(template) {
    const row = {
      title: "",
      time: null,
      duration: null,
      priority: "Medium",
      category: "Personal",
      recurrence: "daily",
      paused: false,
      createdAt: new Date().toISOString(),
      ...template,
    };
    const id = await db.recurringTasks.add(row);
    syncUpsert("recurring_tasks", toRecurringTaskRow({ ...row, id }));
    return id;
  },
  async update(id, changes) {
    await db.recurringTasks.update(id, changes);
    const row = await db.recurringTasks.get(id);
    if (row) syncUpsert("recurring_tasks", toRecurringTaskRow(row));
  },
  async setPaused(id, paused) {
    return recurringTasksRepo.update(id, { paused });
  },
  async remove(id) {
    await db.recurringTasks.delete(id);
    syncDeleteByIds("recurring_tasks", [id]);
  },
};

// Materialises today's due recurring tasks into real `tasks` rows. Call on
// every app load — idempotent via settings.materializedFor, so opening the
// app repeatedly the same day never creates duplicates.
export async function materializeRecurringTasksIfNeeded() {
  const today = todayStr();
  const settings = await settingsRepo.get();
  if (settings.materializedFor === today) return;

  const templates = await db.recurringTasks.toArray();
  const due = templates.filter((t) => !t.paused && isDueOn(t.recurrence, today));

  for (const template of due) {
    await tasksRepo.create({
      title: template.title,
      time: template.time,
      duration: template.duration,
      priority: template.priority,
      category: template.category,
      date: today,
      source: "recurring",
      recurrence: template.recurrence,
      recurringTemplateId: template.id,
    });
  }

  await settingsRepo.update({ materializedFor: today });
}

// Routine templates — a named, reusable bundle of tasks (titles/times/
// durations/priorities/categories only, never statuses).
export const templatesRepo = {
  async list() {
    return db.templates.orderBy("createdAt").reverse().toArray();
  },
  async get(id) {
    return db.templates.get(id);
  },
  async create({ name, tasks }) {
    const row = { name, tasks, createdAt: new Date().toISOString() };
    const id = await db.templates.add(row);
    syncUpsert("templates", toTemplateRow({ ...row, id }));
    return id;
  },
  async remove(id) {
    await db.templates.delete(id);
    syncDeleteByIds("templates", [id]);
  },
};

// Captures today's current tasks (not their statuses) as a new named
// template.
export async function saveTodayAsTemplate(name) {
  const today = todayStr();
  const tasks = await tasksRepo.listByDate(today);
  return templatesRepo.create({
    name,
    tasks: tasks.map((t) => ({
      title: t.title,
      time: t.time,
      duration: t.duration,
      priority: t.priority,
      category: t.category,
    })),
  });
}

// Appends a template's tasks to today. mode "replace" clears today's
// existing tasks first; "merge" (default) just appends alongside them.
export async function applyTemplate(templateId, { mode = "merge" } = {}) {
  const template = await templatesRepo.get(templateId);
  if (!template) return;
  const today = todayStr();

  if (mode === "replace") await tasksRepo.removeByDate(today);

  await tasksRepo.createMany(
    template.tasks.map((t) => ({
      title: t.title,
      time: t.time,
      duration: t.duration,
      priority: t.priority,
      category: t.category,
      status: "Not started",
      date: today,
      source: "template",
    })),
  );
}

export const ideasRepo = {
  async list({ tag, search, unactionedOnly } = {}) {
    let items = await db.ideas.orderBy("timestamp").reverse().toArray();
    if (tag && tag !== "All") items = items.filter((i) => i.tag === tag);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.text.toLowerCase().includes(q));
    }
    if (unactionedOnly) items = items.filter((i) => !i.promotedToTaskId);
    return items;
  },
  async create(idea) {
    const row = { text: "", tag: "Idea", timestamp: new Date().toISOString(), ...idea };
    const id = await db.ideas.add(row);
    syncUpsert("ideas", toIdeaRow({ ...row, id }));
    return id;
  },
  async update(id, changes) {
    await db.ideas.update(id, changes);
    const row = await db.ideas.get(id);
    if (row) syncUpsert("ideas", toIdeaRow(row));
  },
  async remove(id) {
    await db.ideas.delete(id);
    syncDeleteByIds("ideas", [id]);
  },
  async removeByDate(date) {
    const all = await db.ideas.toArray();
    const ids = all.filter((i) => localDateFromISO(i.timestamp) === date).map((i) => i.id);
    await db.ideas.bulkDelete(ids);
    syncDeleteByIds("ideas", ids);
  },
  async randomOlderThan(days = 1) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const all = await db.ideas.toArray();
    const older = all.filter((i) => new Date(i.timestamp).getTime() < cutoff);
    if (older.length === 0) return null;
    return older[Math.floor(Math.random() * older.length)];
  },
  async countByDate(date) {
    const all = await db.ideas.toArray();
    return all.filter((i) => localDateFromISO(i.timestamp) === date).length;
  },
};

// Turns an idea into a real, plannable task dated today. Links both
// directions (`sourceIdeaId` on the task, `promotedToTaskId` on the idea) so
// the idea can show a "became a task" marker and the task can be traced
// back to the thought that spawned it.
export async function promoteIdeaToTask(idea, taskValues) {
  const taskId = await tasksRepo.create({ ...taskValues, date: todayStr(), sourceIdeaId: idea.id });
  await ideasRepo.update(idea.id, { promotedToTaskId: taskId });
  return taskId;
}

export const vocabRepo = {
  async list() {
    return db.vocab.orderBy("dateLearned").reverse().toArray();
  },
  async create(word) {
    const row = { word: "", meaning: "", example: "", dateLearned: todayStr(), ...defaultSrsFields(), ...word };
    const id = await db.vocab.add(row);
    syncUpsert("vocab", toVocabRow({ ...row, id }));
    return id;
  },
  async update(id, changes) {
    await db.vocab.update(id, changes);
    const row = await db.vocab.get(id);
    if (row) syncUpsert("vocab", toVocabRow(row));
  },
  async remove(id) {
    await db.vocab.delete(id);
    syncDeleteByIds("vocab", [id]);
  },
  async removeByDate(date) {
    const ids = await db.vocab.where("dateLearned").equals(date).primaryKeys();
    await db.vocab.bulkDelete(ids);
    syncDeleteByIds("vocab", ids);
  },
  async count() {
    return db.vocab.count();
  },
  async countByDate(date) {
    return db.vocab.where("dateLearned").equals(date).count();
  },
  // Words due today or earlier, oldest-due first — the review queue.
  async listDueToday() {
    const today = todayStr();
    const all = await db.vocab.toArray();
    return all.filter((w) => (w.dueDate ?? today) <= today).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  },
  async countDueToday() {
    return (await vocabRepo.listDueToday()).length;
  },
  // Applies a review rating (SM-2) and reschedules the word's next due date.
  async rate(id, rating) {
    const word = await db.vocab.get(id);
    if (!word) return;
    await vocabRepo.update(id, nextSrsState(word, rating));
  },
};

// One-time backfill for words logged before spaced repetition existed —
// gives them SM-2 defaults and makes them due immediately, per the "Existing
// words with no SRS fields get backfilled... due immediately" requirement.
// Guarded so it only ever touches rows that are actually missing `dueDate`.
export async function backfillVocabSrsIfNeeded() {
  const all = await db.vocab.toArray();
  const unbackfilled = all.filter((w) => w.dueDate === undefined);
  for (const word of unbackfilled) {
    await vocabRepo.update(word.id, defaultSrsFields());
  }
}

export const scoresRepo = {
  async get(date) {
    return db.scores.get(date);
  },
  async upsert(date, data) {
    await db.scores.put({ date, ...data });
    syncUpsert("scores", toScoreRow(date, data));
  },
  async list() {
    return db.scores.orderBy("date").toArray();
  },
  async remove(date) {
    await db.scores.delete(date);
    syncDeleteByKey("scores", "date", date);
  },
};

// Backs the History screen (see src/pages/History.jsx). Never touches the
// private journal. Reads are kept cheap for users with a long history: the
// date list only walks indexes (no full task/score rows), and per-day task
// rows are only pulled for whatever page is actually being shown.
export const historyRepo = {
  // Every distinct date that has a task or a recorded score, most recent
  // first — the universe of "days" History can show.
  async listDates() {
    const [taskDates, scoreDates] = await Promise.all([
      db.tasks.orderBy("date").uniqueKeys(),
      db.scores.orderBy("date").keys(),
    ]);
    return [...new Set([...taskDates, ...scoreDates])].sort().reverse();
  },
  // One page of day summaries (date, tasksPlanned/Completed, score-or-null),
  // most recent first. `before` is an exclusive upper-bound date string, for
  // paging backward in time or jumping straight to a given month.
  async listDaySummaries({ before, limit = 30 } = {}) {
    const dates = await historyRepo.listDates();
    const page = (before ? dates.filter((d) => d < before) : dates).slice(0, limit);
    if (page.length === 0) return [];

    const [scores, tasks] = await Promise.all([
      db.scores.where("date").anyOf(page).toArray(),
      db.tasks.where("date").anyOf(page).toArray(),
    ]);
    const scoreByDate = new Map(scores.map((s) => [s.date, s]));
    const tasksByDate = new Map();
    for (const t of tasks) {
      if (!tasksByDate.has(t.date)) tasksByDate.set(t.date, []);
      tasksByDate.get(t.date).push(t);
    }

    return page.map((date) => {
      const score = scoreByDate.get(date);
      const dayTasks = tasksByDate.get(date) || [];
      return {
        date,
        tasksPlanned: score ? score.tasksPlanned : dayTasks.filter((t) => t.status !== "Skipped").length,
        tasksCompleted: score ? score.tasksCompleted : dayTasks.filter((t) => t.status === "Done").length,
        score: score ? score.score : null,
      };
    });
  },
};

// Three independent streaks, all derived on read from scores/vocab history
// (see src/lib/streaks.js) rather than a stored counter.
export async function getStreaks() {
  const [settings, scores, vocab] = await Promise.all([settingsRepo.get(), db.scores.toArray(), db.vocab.toArray()]);
  const today = todayStr();

  const reviewDates = new Set(scores.map((s) => s.date));
  const scoreDates = new Set(scores.filter((s) => s.score >= settings.scoreStreakThreshold).map((s) => s.date));
  const vocabDates = new Set(vocab.map((v) => v.dateLearned));

  const earliestScoreDate = scores.length ? scores.map((s) => s.date).sort()[0] : undefined;
  const earliestVocabDate = vocab.length ? vocab.map((v) => v.dateLearned).sort()[0] : undefined;

  return {
    review: computeStreak(reviewDates, today, { earliestDate: earliestScoreDate }),
    score: computeStreak(scoreDates, today, { earliestDate: earliestScoreDate }),
    vocab: computeStreak(vocabDates, today, { earliestDate: earliestVocabDate }),
  };
}

// Last `days` of scores/sleep/screen-time/tasks for the Insights tab — local
// computation only. Never includes task titles, idea text, or vocab content;
// see src/lib/insights.js for what's derived from this and what (if
// anything) gets sent to Gemini for "Explain my patterns".
export async function getInsightsData(days = 30) {
  const cutoff = addDaysToStr(todayStr(), -days);
  const [scores, sleep, screenTime, tasks, settings] = await Promise.all([
    db.scores.toArray(),
    db.sleep.toArray(),
    db.screenTime.toArray(),
    db.tasks.toArray(),
    settingsRepo.get(),
  ]);
  const inRange = (date) => date >= cutoff;
  return {
    scores: scores.filter((s) => inRange(s.date)),
    sleep: sleep.filter((s) => inRange(s.date)),
    screenTime: screenTime.filter((s) => inRange(s.date)),
    tasks: tasks.filter((t) => inRange(t.date)),
    screenTimeLimitMinutes: settings.screenTimeLimitMinutes,
  };
}

// Cached AI section of a week's review — see src/lib/weeklyReview.js for
// week-boundary helpers and Review.jsx's "Weekly" tab. The private journal
// is never part of this: nothing here touches db.journal/db.journalMeta.
export const weeklyReviewsRepo = {
  async getAi(weekStart) {
    const row = await db.weeklyReviews.get(weekStart);
    return row?.ai || null;
  },
  async saveAi(weekStart, ai) {
    await db.weeklyReviews.put({ weekStart, ai });
    syncUpsert("weekly_reviews", toWeeklyReviewRow({ weekStart, ai }), "week_start");
  },
};

// Everything the Weekly tab needs, recomputed fresh from the underlying
// tables each time (so it can never go stale the way a stored snapshot
// could) — except the AI section, which IS cached (see weeklyReviewsRepo).
export async function getWeeklyReviewData(weekStart) {
  const dates = weekDates(weekStart);
  const dateSet = new Set(dates);

  const [scores, tasks, ideas, vocab, sleep, screenTime, settings, cachedAi] = await Promise.all([
    db.scores.toArray(),
    db.tasks.toArray(),
    db.ideas.toArray(),
    db.vocab.toArray(),
    db.sleep.toArray(),
    db.screenTime.toArray(),
    settingsRepo.get(),
    weeklyReviewsRepo.getAi(weekStart),
  ]);

  const weekScores = scores.filter((s) => dateSet.has(s.date)).sort((a, b) => a.date.localeCompare(b.date));
  const weekTasks = tasks.filter((t) => dateSet.has(t.date));
  const weekIdeas = ideas.filter((i) => dateSet.has(localDateFromISO(i.timestamp)));
  const weekVocab = vocab.filter((v) => dateSet.has(v.dateLearned));
  const weekSleep = sleep.filter((s) => dateSet.has(s.date) && s.hours != null);
  const weekScreenTime = screenTime.filter((s) => dateSet.has(s.date));

  const tasksCompleted = weekScores.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0);
  const tasksPlanned = weekScores.reduce((sum, s) => sum + (s.tasksPlanned || 0), 0);
  const avgScore = weekScores.length ? Math.round(weekScores.reduce((sum, s) => sum + s.score, 0) / weekScores.length) : null;

  const completedByCategory = new Map();
  for (const t of weekTasks) {
    if (t.status !== "Done") continue;
    completedByCategory.set(t.category, (completedByCategory.get(t.category) || 0) + 1);
  }

  let bestDay = null;
  let worstDay = null;
  for (const s of weekScores) {
    if (!bestDay || s.score > bestDay.score) bestDay = s;
    if (!worstDay || s.score < worstDay.score) worstDay = s;
  }

  const totalScreenMinutes = weekScreenTime.reduce((sum, s) => sum + s.minutes, 0);

  return {
    weekStart,
    dates,
    scores: weekScores,
    avgScore,
    tasksCompleted,
    tasksPlanned,
    categoryBreakdown: [...completedByCategory.entries()].map(([category, completed]) => ({ category, completed })),
    ideasCount: weekIdeas.length,
    wordsCount: weekVocab.length,
    ideaToTaskCount: weekIdeas.filter((i) => i.promotedToTaskId).length,
    ideaTitles: weekIdeas.map((i) => i.text.split("\n")[0].trim()).filter(Boolean),
    avgSleepHours: weekSleep.length
      ? Math.round((weekSleep.reduce((sum, s) => sum + s.hours, 0) / weekSleep.length) * 10) / 10
      : null,
    totalScreenMinutes,
    screenBudgetMinutes: settings.screenTimeLimitMinutes * 7,
    bestDay,
    worstDay,
    cachedAi,
  };
}

export const sleepRepo = {
  async get(date) {
    return db.sleep.get(date);
  },
  async list() {
    return db.sleep.orderBy("date").toArray();
  },
  async recent(days = 14) {
    const all = await db.sleep.orderBy("date").reverse().limit(days).toArray();
    return all.reverse();
  },
  async upsert(date, { bedtime, wakeTime, hours, quality, notes }) {
    const computed = hours ?? computeSleepHours(bedtime, wakeTime);
    const row = { date, bedtime: bedtime || null, wakeTime: wakeTime || null, hours: computed, quality: quality ?? null, notes: notes || "" };
    await db.sleep.put(row);
    syncUpsert("sleep", toSleepRow(date, row));
  },
  async remove(date) {
    await db.sleep.delete(date);
    syncDeleteByKey("sleep", "date", date);
  },
};

export const screenTimeRepo = {
  // Self-logged (see Screen Time page copy) — reads/writes one row per day.
  async get(date) {
    const row = await db.screenTime.get(date);
    return row || { date, app: SCREEN_TIME_APP, minutes: 0, alertedAt: null };
  },
  async list() {
    return db.screenTime.orderBy("date").toArray();
  },
  async recent(days = 14) {
    const all = await db.screenTime.orderBy("date").reverse().limit(days).toArray();
    return all.reverse();
  },
  async addMinutes(date, minutes) {
    const current = await screenTimeRepo.get(date);
    const next = { ...current, minutes: Math.max(0, current.minutes + minutes) };
    await db.screenTime.put(next);
    syncUpsert("screen_time", toScreenTimeRow(next));
    return next;
  },
  async markAlerted(date) {
    const current = await screenTimeRepo.get(date);
    const next = { ...current, alertedAt: new Date().toISOString() };
    await db.screenTime.put(next);
    syncUpsert("screen_time", toScreenTimeRow(next));
  },
  async reset(date) {
    const row = { date, app: SCREEN_TIME_APP, minutes: 0, alertedAt: null };
    await db.screenTime.put(row);
    syncUpsert("screen_time", toScreenTimeRow(row));
  },
  async remove(date) {
    await db.screenTime.delete(date);
    syncDeleteByKey("screen_time", "date", date);
  },
};

export const settingsRepo = {
  // Read-only (safe to call inside a Dexie liveQuery) — falls back to
  // in-memory defaults if the row hasn't been seeded yet, and backfills any
  // keys added to DEFAULT_SETTINGS after a user's row was first created.
  async get() {
    const existing = await db.settings.get(SETTINGS_ID);
    return existing ? { ...DEFAULT_SETTINGS, ...existing } : DEFAULT_SETTINGS;
  },
  async ensureSeeded() {
    const existing = await db.settings.get(SETTINGS_ID);
    if (!existing) await db.settings.put(DEFAULT_SETTINGS);
  },
  async update(changes) {
    const current = await settingsRepo.get();
    const next = { ...current, ...changes };
    await db.settings.put(next);
    syncUpsert("app_settings", toSettingsRow(SETTINGS_ID, next));
    return next;
  },
};

export async function exportAllData() {
  const [tasks, ideas, vocab, scores, settings, sleep, screenTime, recurringTasks, templates, weeklyReviews] =
    await Promise.all([
      db.tasks.toArray(),
      db.ideas.toArray(),
      db.vocab.toArray(),
      db.scores.toArray(),
      db.settings.toArray(),
      db.sleep.toArray(),
      db.screenTime.toArray(),
      db.recurringTasks.toArray(),
      db.templates.toArray(),
      db.weeklyReviews.toArray(),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    tasks,
    ideas,
    vocab,
    scores,
    settings,
    sleep,
    screenTime,
    recurringTasks,
    templates,
    weeklyReviews,
  };
}

// Wipes everything logged for one specific date — tasks, ideas, vocab,
// sleep, screen time, and any locked-in score — without touching other
// days' history or app settings/config. Also removes the same rows from
// Supabase (via each repo method's own sync-delete call). If clearing
// today, also resets the recurring-task materialization marker so those
// tasks re-materialize on next load instead of staying missing.
export async function clearDataForDate(date) {
  await Promise.all([
    tasksRepo.removeByDate(date),
    ideasRepo.removeByDate(date),
    vocabRepo.removeByDate(date),
    sleepRepo.remove(date),
    screenTimeRepo.remove(date),
    scoresRepo.remove(date),
  ]);
  const settings = await settingsRepo.get();
  if (settings.materializedFor === date) {
    await settingsRepo.update({ materializedFor: null });
  }
}

// Pushes every locally-stored row (tasks/ideas/vocab/scores/sleep/screen
// time/settings — never the private journal) back onto the sync queue as an
// upsert, so a full resync just rides the same retry/backoff engine as any
// other write rather than being a separate one-shot network operation.
export async function forceFullResync() {
  const [tasks, ideas, vocab, scores, sleep, screenTime, settings, recurringTasks, templates, weeklyReviews] =
    await Promise.all([
      db.tasks.toArray(),
      db.ideas.toArray(),
      db.vocab.toArray(),
      db.scores.toArray(),
      db.sleep.toArray(),
      db.screenTime.toArray(),
      db.settings.toArray(),
      db.recurringTasks.toArray(),
      db.templates.toArray(),
      db.weeklyReviews.toArray(),
    ]);

  await Promise.all([
    ...tasks.map((t) => syncUpsert("tasks", toTaskRow(t))),
    ...ideas.map((i) => syncUpsert("ideas", toIdeaRow(i))),
    ...vocab.map((v) => syncUpsert("vocab", toVocabRow(v))),
    ...scores.map((s) => syncUpsert("scores", toScoreRow(s.date, s))),
    ...sleep.map((s) => syncUpsert("sleep", toSleepRow(s.date, s))),
    ...screenTime.map((s) => syncUpsert("screen_time", toScreenTimeRow(s))),
    ...settings.map((s) => syncUpsert("app_settings", toSettingsRow(s.id, s))),
    ...recurringTasks.map((r) => syncUpsert("recurring_tasks", toRecurringTaskRow(r))),
    ...templates.map((t) => syncUpsert("templates", toTemplateRow(t))),
    ...weeklyReviews.map((w) => syncUpsert("weekly_reviews", toWeeklyReviewRow(w), "week_start")),
  ]);
}

export async function clearAllData() {
  await Promise.all([
    db.tasks.clear(),
    db.ideas.clear(),
    db.vocab.clear(),
    db.scores.clear(),
    db.settings.clear(),
    db.sleep.clear(),
    db.screenTime.clear(),
    db.recurringTasks.clear(),
    db.templates.clear(),
    db.weeklyReviews.clear(),
  ]);
}
