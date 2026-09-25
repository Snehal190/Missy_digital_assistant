import { addDaysToStr } from "./dates";

// Streaks are derived fresh from DailyScore/vocab history every time they're
// read — never stored as a mutable counter — so a missed write, a cleared
// day, or editing old data always self-corrects instead of drifting.
//
// One grace day per rolling 7-day window: a single miss inside any trailing
// 7 calendar days doesn't break the streak (it keeps counting, just flagged
// "recovering"); a second miss inside that same window does break it.
//
// `earliestDate` bounds how far back we walk — without it, the days before
// you ever started logging anything would look like an endless run of
// misses and instantly cap the streak at 0.
export function computeStreak(qualifyingDates, todayStr, { graceDaysPerWeek = 1, earliestDate } = {}) {
  if (qualifyingDates.size === 0) return { count: 0, recovering: false };

  let cursor = qualifyingDates.has(todayStr) ? todayStr : addDaysToStr(todayStr, -1);
  let count = 0;
  let recovering = false;
  const window = []; // trailing 7 calendar days, true = miss

  for (let daysChecked = 0; daysChecked < 3650; daysChecked += 1) {
    if (earliestDate && cursor < earliestDate) break;

    const isHit = qualifyingDates.has(cursor);
    window.push(!isHit);
    if (window.length > 7) window.shift();
    const missesInWindow = window.filter(Boolean).length;

    if (isHit) {
      count += 1;
    } else if (missesInWindow <= graceDaysPerWeek) {
      recovering = true; // grace day spent, streak survives
    } else {
      break; // a second miss inside 7 days — streak ends before this day
    }

    cursor = addDaysToStr(cursor, -1);
  }

  return { count, recovering: recovering && count > 0 };
}
