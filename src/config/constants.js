export const SETTINGS_ID = "app-settings";

export const DEFAULT_TAGS = ["Work", "Health", "Learning", "Personal"];

export const PRIORITIES = ["High", "Medium", "Low"];

export const TASK_STATUSES = ["Not started", "In progress", "Done", "Skipped"];

export const IDEA_TAGS = ["Idea", "Learning", "Reflection", "Other"];

// Weights are applied to normalized (0-1) sub-scores, and should sum to 1.
// Tune here without touching UI/scoring logic.
export const DEFAULT_SCORE_WEIGHTS = {
  taskCompletion: 0.7,
  ideasLogged: 0.15,
  wordsLearned: 0.15,
};

// Soft caps used to normalize ideas/words counts into a 0-1 sub-score
// (logging more than this in a day still counts as "full credit").
export const SCORE_CAPS = {
  ideasLogged: 3,
  wordsLearned: 3,
};

// Sleep hours below this are flagged in the AI insight prompt as short.
export const RECOMMENDED_SLEEP_HOURS = 8;

export const SCREEN_TIME_APP = "Instagram";
export const DEFAULT_SCREEN_TIME_LIMIT_MINUTES = 60;

export const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  tagList: DEFAULT_TAGS,
  ideaTagList: IDEA_TAGS,
  scoreWeights: DEFAULT_SCORE_WEIGHTS,
  scoreCaps: SCORE_CAPS,
  customQuotes: [],
  screenTimeLimitMinutes: DEFAULT_SCREEN_TIME_LIMIT_MINUTES,
  // Date (YYYY-MM-DD) recurring tasks were last materialized for — guards
  // materializeRecurringTasksIfNeeded() against creating duplicates when the
  // app is opened more than once in a day.
  materializedFor: null,
  // When false, the end-of-day review skips the carry-over step entirely —
  // unfinished tasks just stay as-is, same as before this feature existed.
  carryOverEnabled: true,
  // Daily score at/above this counts as a "good day" for the score streak.
  scoreStreakThreshold: 70,
  // Cached "Explain my patterns" AI result: { generatedAt, observations,
  // experiment } — reused for 24h so re-opening Insights doesn't burn quota.
  insightsCache: null,
  // Task reminders (see src/hooks/useReminderScheduler.js). Reminders only
  // fire while Missy is open/installed in this session — never guaranteed
  // background push.
  remindersEnabledByDefault: true,
  reminderLeadMinutes: 5,
  morningNudgeEnabled: false,
  morningNudgeTime: "07:30",
  eveningNudgeEnabled: false,
  eveningNudgeTime: "21:00",
  // Shown once on Settings for iOS users who haven't added Missy to their
  // home screen, since PWA notifications there need that to fire reliably.
  iosReminderNoticeSeen: false,
};

// Private journal — calm 1-5 scale, plain words rather than emoji.
export const MOOD_SCALE = [
  { value: 1, label: "Low" },
  { value: 2, label: "Meh" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
];

export const JOURNAL_AUTO_LOCK_MINUTES = 3;

// Credentials vault — locks after this many minutes of inactivity or when
// the app is backgrounded, same model as the private journal.
export const VAULT_AUTO_LOCK_MINUTES = 3;
