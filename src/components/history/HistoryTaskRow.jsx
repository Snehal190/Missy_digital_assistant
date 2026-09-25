import { emojiFor } from "../../lib/categoryIcons";

const PRIORITY_DOT = {
  High: "bg-red",
  Medium: "bg-charcoal/60",
  Low: "bg-sage",
};

const STATUS_BADGE = {
  Done: "bg-red/15 text-red",
  "In progress": "bg-sage/25 text-ink",
  "Not started": "bg-sage/10 text-sage",
  Skipped: "bg-sage/10 text-sage",
};

// Read-only — History never edits a task's status or details. See TaskCard
// for the interactive version used on Today.
export default function HistoryTaskRow({ task }) {
  const done = task.status === "Done";
  const skipped = task.status === "Skipped";

  return (
    <div className={`flex items-center gap-3 rounded-[1.5rem] border border-sage/30 bg-surface p-3 ${skipped ? "opacity-60" : ""}`}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-charcoal/10 text-xl">
        {emojiFor(task.category)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-bold text-ink ${done ? "line-through opacity-60" : ""}`}>{task.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-sage">
          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          {task.time || "Anytime"}
          {" · "}
          {task.category}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE[task.status] || STATUS_BADGE["Not started"]}`}>
        {task.status}
      </span>
    </div>
  );
}
