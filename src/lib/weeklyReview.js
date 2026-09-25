import { startOfWeek, parseISO } from "date-fns";
import { todayStr, dateStr, addDaysToStr, formatShort } from "./dates";

// Weeks run Monday -> Sunday. `weekStart` is always that Monday's
// "yyyy-MM-dd" string — the key used everywhere (storage, URLs, comparisons).
export function weekStartFor(dateLike) {
  return dateStr(startOfWeek(typeof dateLike === "string" ? parseISO(dateLike) : dateLike, { weekStartsOn: 1 }));
}

export function weekEndFor(weekStart) {
  return addDaysToStr(weekStart, 6);
}

export function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDaysToStr(weekStart, i));
}

export function describeWeekRange(weekStart) {
  return `${formatShort(weekStart)} – ${formatShort(weekEndFor(weekStart))}`;
}

// "Available from Sunday evening onward" — treated loosely as "once we've
// reached that week's Sunday", rather than tracking exact time-of-day.
export function isWeekReviewable(weekStart) {
  return todayStr() >= weekEndFor(weekStart);
}

export function previousWeekStart(weekStart) {
  return addDaysToStr(weekStart, -7);
}

export function nextWeekStart(weekStart) {
  return addDaysToStr(weekStart, 7);
}
