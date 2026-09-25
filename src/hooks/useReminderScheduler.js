import { useEffect } from "react";
import { todayStr } from "../lib/dates";
import { reminderFireTime, nudgeFireTime, DEFAULT_REMINDER_LEAD_MINUTES } from "../lib/reminders";

// setTimeout delays beyond this overflow to firing immediately in most
// browsers — nothing we schedule (same-day only) should ever hit it, but
// guard anyway.
const MAX_DELAY_MS = 2 ** 31 - 1;

async function showReminder(title, body, taskId) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag: taskId ? `missy-task-${taskId}` : "missy-nudge",
        data: { taskId: taskId ?? null },
      });
    } else {
      // No service worker (unsupported browser) — best-effort foreground-only fallback.
      new Notification(title, { body });
    }
  } catch {
    // Reminders are a bonus, never the only signal — fail silently.
  }
}

// Schedules today's remaining task reminders + morning/evening nudges with
// plain setTimeout, for THIS session only. Re-runs (clearing and
// rescheduling) whenever tasks or settings change, and on every app load —
// which is what "survives a refresh" means here: nothing persists across a
// reload, but reopening the app always re-registers what's left of today.
export function useReminderScheduler(tasks, settings) {
  useEffect(() => {
    if (!settings) return;
    const timers = [];
    const now = Date.now();
    const today = todayStr();

    function schedule(fireDate, run) {
      const delay = fireDate.getTime() - now;
      if (delay <= 0 || delay > MAX_DELAY_MS) return;
      timers.push(setTimeout(run, delay));
    }

    for (const task of tasks) {
      if (!task.time || !task.remindMe) continue;
      if (task.status === "Done" || task.status === "Skipped") continue;
      const lead = settings.reminderLeadMinutes ?? DEFAULT_REMINDER_LEAD_MINUTES;
      const fireAt = reminderFireTime(today, task.time, lead);
      const body = lead > 0 ? `Starting in ${lead} minute${lead === 1 ? "" : "s"} (${task.time})` : `Starting now (${task.time})`;
      schedule(fireAt, () => showReminder(task.title, body, task.id));
    }

    if (settings.morningNudgeEnabled && settings.morningNudgeTime) {
      schedule(nudgeFireTime(today, settings.morningNudgeTime), () =>
        showReminder("Plan your day", "Speak your day into Missy to build today's schedule.", null),
      );
    }
    if (settings.eveningNudgeEnabled && settings.eveningNudgeTime) {
      schedule(nudgeFireTime(today, settings.eveningNudgeTime), () =>
        showReminder("End your day", "Time for your evening review.", null),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [tasks, settings]);
}
