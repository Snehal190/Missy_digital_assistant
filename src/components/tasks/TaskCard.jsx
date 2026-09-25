import { CheckIcon, SyncIcon, BellIcon } from "../icons";
import { emojiFor } from "../../lib/categoryIcons";
import { describeRecurrence } from "../../lib/recurrence";
import SwipeToDelete from "../ui/SwipeToDelete";

const PRIORITY_DOT = {
  High: "bg-red",
  Medium: "bg-charcoal/60",
  Low: "bg-sage",
};

export default function TaskCard({ task, onToggleDone, onEdit, onDelete }) {
  const done = task.status === "Done";
  const skipped = task.status === "Skipped";
  const emoji = emojiFor(task.category);
  const carryDay = task.carryCount ? task.carryCount + 1 : 0;
  const showNudge = task.carryCount >= 3 && !done;

  return (
    <SwipeToDelete onDelete={() => onDelete(task)}>
      <div
        className={`rounded-[1.5rem] border border-sage/30 bg-surface p-3 transition-opacity ${
          skipped ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-charcoal/10 text-2xl">
              {emoji}
            </span>
            <span className="min-w-0">
              <span className={`block truncate text-[18px] font-bold text-ink ${done ? "line-through opacity-50" : ""}`}>
                {task.title}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-sage">
                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                {task.time || "Anytime"}
                {task.duration ? ` · ${task.duration}m` : ""}
                {task.recurrence && (
                  <span className="flex items-center gap-0.5" title={describeRecurrence(task.recurrence)}>
                    <SyncIcon className="h-3 w-3" />
                  </span>
                )}
                {task.remindMe && task.time && (
                  <span className="flex items-center gap-0.5" title="Reminder set">
                    <BellIcon className="h-3 w-3" />
                  </span>
                )}
                {carryDay >= 2 && (
                  <span
                    className="rounded-full bg-sage/25 px-1.5 py-0.5 text-[10px] font-bold text-ink"
                    title={`Carried forward from ${task.carriedFrom}`}
                  >
                    Day {carryDay}
                  </span>
                )}
              </span>
            </span>
          </button>

          <button
            type="button"
            aria-label={done ? "Mark not done" : "Mark done"}
            onClick={() => onToggleDone(task)}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
              done ? "border-red bg-red text-white" : "border-sage/40 bg-surface text-transparent hover:border-red hover:text-red"
            }`}
          >
            <CheckIcon className="h-4 w-4" />
          </button>
        </div>

        {showNudge && (
          <p className="mt-2 rounded-xl bg-sage/15 px-3 py-2 text-[11px] font-semibold text-ink">
            This one's been carried a few days now — maybe break it into something smaller, or it's okay to drop it. 💛
          </p>
        )}
      </div>
    </SwipeToDelete>
  );
}
