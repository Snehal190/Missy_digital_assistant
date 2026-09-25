import { Link } from "react-router-dom";
import { formatFriendly } from "../../lib/dates";

export default function HistoryDayRow({ day }) {
  return (
    <Link
      to={`/history/${day.date}`}
      className="flex items-center gap-3 rounded-[1.5rem] border border-sage/30 bg-surface p-3"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red/10 text-sm font-black text-red">
        {day.score ?? "—"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{formatFriendly(day.date)}</p>
        <p className="text-xs font-semibold text-sage">
          {day.tasksCompleted} / {day.tasksPlanned} tasks
        </p>
      </div>
    </Link>
  );
}
