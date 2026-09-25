import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { TrashIcon, CheckIcon } from "../icons";

const TAG_COLOR = {
  Idea: "bg-red/10 text-red",
  Learning: "bg-sage/40 text-ink",
  Reflection: "bg-charcoal/10 text-ink",
  Other: "bg-sage/20 text-ink",
};

export default function IdeaCard({ idea, onRemove, onPromote }) {
  return (
    <div className="rounded-[1.5rem] border border-sage/30 bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${TAG_COLOR[idea.tag] || TAG_COLOR.Other}`}>
          {idea.tag}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-sage">{format(parseISO(idea.timestamp), "MMM d, h:mm a")}</span>
          <button type="button" onClick={() => onRemove(idea)} aria-label="Delete" className="text-sage hover:text-red">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-ink">{idea.text}</p>

      <div className="mt-3">
        {idea.promotedToTaskId ? (
          <Link
            to={`/?promoted=${idea.promotedToTaskId}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-sage/20 px-3 py-1.5 text-[11px] font-bold text-ink"
          >
            <CheckIcon className="h-3 w-3" />
            Became a task
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onPromote(idea)}
            className="rounded-full border border-sage/30 bg-base px-3 py-1.5 text-[11px] font-bold text-ink"
          >
            Make it a task
          </button>
        )}
      </div>
    </div>
  );
}
