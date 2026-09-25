import { parseISO } from "date-fns";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const RECURRENCE_CHOICES = [
  { value: null, label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekly", label: "Weekly" }, // resolved to weekly:<today's day> at creation time
];

export function dayNameFor(dateStr) {
  return DAY_NAMES[parseISO(dateStr).getDay()];
}

// A recurrence value is due on `dateStr` if...
export function isDueOn(recurrence, dateStr) {
  if (!recurrence) return false;
  const day = dayNameFor(dateStr);
  const isWeekend = day === "saturday" || day === "sunday";

  if (recurrence === "daily") return true;
  if (recurrence === "weekdays") return !isWeekend;
  if (recurrence === "weekends") return isWeekend;
  if (recurrence.startsWith("weekly:")) return recurrence.slice("weekly:".length) === day;
  return false;
}

export function describeRecurrence(recurrence) {
  if (!recurrence) return null;
  if (recurrence === "daily") return "Daily";
  if (recurrence === "weekdays") return "Weekdays";
  if (recurrence === "weekends") return "Weekends";
  if (recurrence.startsWith("weekly:")) {
    const day = recurrence.slice("weekly:".length);
    return `Weekly on ${day.charAt(0).toUpperCase()}${day.slice(1)}s`;
  }
  return recurrence;
}
