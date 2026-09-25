export const DEFAULT_REMINDER_LEAD_MINUTES = 5;

function atTime(date, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

// Exact moment a task's reminder should fire: `leadMinutes` before its
// scheduled time.
export function reminderFireTime(date, time, leadMinutes) {
  return new Date(atTime(date, time).getTime() - leadMinutes * 60 * 1000);
}

// Exact moment a daily nudge (morning plan / evening review) fires.
export function nudgeFireTime(date, hhmm) {
  return atTime(date, hhmm);
}
