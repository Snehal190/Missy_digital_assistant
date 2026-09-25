import { format, parseISO, addDays, addMonths } from "date-fns";

export const DATE_FMT = "yyyy-MM-dd";

export function todayStr() {
  return format(new Date(), DATE_FMT);
}

export function dateStr(date) {
  return format(date, DATE_FMT);
}

export function parseDateStr(str) {
  return parseISO(str);
}

export function formatFriendly(str) {
  return format(parseISO(str), "EEEE, MMM d");
}

export function formatShort(str) {
  return format(parseISO(str), "MMM d");
}

// Converts a UTC ISO timestamp (e.g. an idea's `timestamp`) into the local
// calendar date it falls on. Never compare timestamps to a date string with
// `.slice(0, 10)` — that reads the UTC date, which silently drifts a day off
// from `todayStr()` (local) whenever local time is ahead of UTC.
export function localDateFromISO(iso) {
  return dateStr(parseISO(iso));
}

export function addDaysToStr(str, days) {
  return dateStr(addDays(parseISO(str), days));
}

// "YYYY-MM-DD" -> "YYYY-MM", for grouping date-keyed rows by month.
export function monthKey(str) {
  return str.slice(0, 7);
}

export function formatMonthLabel(key) {
  return format(parseISO(`${key}-01`), "MMMM yyyy");
}

// First day of the month after `key` ("YYYY-MM") — an exclusive upper-bound
// cursor for paging a date list starting from that month.
export function startOfNextMonthStr(key) {
  return dateStr(addMonths(parseISO(`${key}-01`), 1));
}
