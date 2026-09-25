import { dayNameFor } from "./recurrence";

// Below this many data points on a side, a comparison would be more noise
// than signal — show "keep logging" instead of a misleading number.
export const MIN_COMPARISON_DATA_POINTS = 5;
export const MIN_WEEKDAY_DATA_POINTS = 7;
export const SLEEP_COMPARISON_THRESHOLD_HOURS = 7;

function average(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

// Average score on nights with 7+ hours sleep vs under 7.
export function sleepScoreComparison({ scores, sleep }) {
  const hoursByDate = new Map(sleep.map((s) => [s.date, s.hours]));
  const above = [];
  const below = [];
  for (const s of scores) {
    const hours = hoursByDate.get(s.date);
    if (hours == null) continue;
    (hours >= SLEEP_COMPARISON_THRESHOLD_HOURS ? above : below).push(s.score);
  }
  if (above.length < MIN_COMPARISON_DATA_POINTS || below.length < MIN_COMPARISON_DATA_POINTS) {
    return { ready: false, needMore: MIN_COMPARISON_DATA_POINTS - Math.min(above.length, below.length) };
  }
  return {
    ready: true,
    aboveAvg: Math.round(average(above)),
    belowAvg: Math.round(average(below)),
    aboveCount: above.length,
    belowCount: below.length,
  };
}

// Average score on days under the screen-time budget vs at/over it.
export function screenTimeScoreComparison({ scores, screenTime, screenTimeLimitMinutes }) {
  const minutesByDate = new Map(screenTime.map((s) => [s.date, s.minutes]));
  const under = [];
  const over = [];
  for (const s of scores) {
    const minutes = minutesByDate.get(s.date);
    if (minutes == null) continue;
    (minutes < screenTimeLimitMinutes ? under : over).push(s.score);
  }
  if (under.length < MIN_COMPARISON_DATA_POINTS || over.length < MIN_COMPARISON_DATA_POINTS) {
    return { ready: false, needMore: MIN_COMPARISON_DATA_POINTS - Math.min(under.length, over.length) };
  }
  return {
    ready: true,
    underAvg: Math.round(average(under)),
    overAvg: Math.round(average(over)),
    underCount: under.length,
    overCount: over.length,
  };
}

// Completion rate per category over the given task list (already
// date-filtered by the caller). Skipped tasks are excluded from the
// denominator, matching the daily-score formula's convention.
export function categoryCompletionRates(tasks) {
  const byCategory = new Map();
  for (const t of tasks) {
    if (t.status === "Skipped") continue;
    if (!byCategory.has(t.category)) byCategory.set(t.category, { completed: 0, planned: 0 });
    const entry = byCategory.get(t.category);
    entry.planned += 1;
    if (t.status === "Done") entry.completed += 1;
  }
  return [...byCategory.entries()]
    .map(([category, { completed, planned }]) => ({
      category,
      completed,
      planned,
      rate: planned ? Math.round((completed / planned) * 100) : null,
    }))
    .sort((a, b) => b.planned - a.planned);
}

// Best/worst day of the week by average score.
export function bestWorstDayOfWeek(scores) {
  if (scores.length < MIN_WEEKDAY_DATA_POINTS) {
    return { ready: false, needMore: MIN_WEEKDAY_DATA_POINTS - scores.length };
  }
  const byDay = new Map();
  for (const s of scores) {
    const day = dayNameFor(s.date);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(s.score);
  }
  const averaged = [...byDay.entries()].map(([day, list]) => ({
    day,
    avg: Math.round(average(list)),
    count: list.length,
  }));
  if (averaged.length < 2) return { ready: false, needMore: 1 };

  averaged.sort((a, b) => b.avg - a.avg);
  return { ready: true, best: averaged[0], worst: averaged[averaged.length - 1] };
}
