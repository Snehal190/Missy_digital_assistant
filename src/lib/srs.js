import { todayStr, addDaysToStr } from "./dates";

// SM-2 spaced repetition. New/backfilled words start due immediately.
export const SRS_DEFAULTS = { easeFactor: 2.5, interval: 0, repetitions: 0 };

export function defaultSrsFields() {
  return { ...SRS_DEFAULTS, dueDate: todayStr() };
}

// Four-button rating mapped onto SM-2's 0-5 quality scale.
const QUALITY = { again: 0, hard: 3, good: 4, easy: 5 };

// Given a word's current SRS fields and a rating, returns the next
// { easeFactor, interval, repetitions, dueDate }. Standard SM-2: any quality
// below 3 ("Again") resets repetitions and schedules a same-day-tomorrow
// retry; otherwise interval grows 1 -> 6 -> interval*easeFactor, and
// easeFactor itself is nudged by how easy/hard the recall felt.
export function nextSrsState(word, rating) {
  const q = QUALITY[rating];
  if (q === undefined) throw new Error(`Unknown SRS rating: ${rating}`);

  let easeFactor = word.easeFactor ?? SRS_DEFAULTS.easeFactor;
  let interval = word.interval ?? SRS_DEFAULTS.interval;
  let repetitions = word.repetitions ?? SRS_DEFAULTS.repetitions;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return { easeFactor, interval, repetitions, dueDate: addDaysToStr(todayStr(), interval) };
}

// interval is in days; >21 days between reviews is a reasonable "mastered"
// bar without being so high it never lights up.
export const MASTERED_INTERVAL_DAYS = 21;
