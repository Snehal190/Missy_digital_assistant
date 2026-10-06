import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { IDEA_TAGS } from "../../config/constants";
import { TrashIcon, CheckIcon, EditIcon } from "../icons";

const TAG_COLOR = {
  Idea: "bg-red/10 text-red",
  Learning: "bg-sage/40 text-ink",
  Reflection: "bg-charcoal/10 text-ink",
  Other: "bg-sage/20 text-ink",
};

export default function IdeaCard({ idea, onRemove, onPromote, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(idea.text);
  const [tag, setTag] = useState(idea.tag);

  function startEditing() {
    setText(idea.text);
    setTag(idea.tag);
    setEditing(true);
  }

  async function save() {
    const trimmed = text.trim();
    if (!trimmed) return;
    await onUpdate(idea.id, { text: trimmed, tag });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-[1.5rem] border border-ink/40 bg-surface p-4">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-2xl border border-sage/30 bg-base px-3 py-2 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
        />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {IDEA_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTag(t)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                tag === t ? "border-charcoal bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-10 flex-1 rounded-xl border border-sage/30 bg-surface text-xs font-bold text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!text.trim()}
            className="h-10 flex-1 rounded-xl bg-charcoal text-xs font-bold text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-sage/30 bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${TAG_COLOR[idea.tag] || TAG_COLOR.Other}`}>
          {idea.tag}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-sage">{format(parseISO(idea.timestamp), "MMM d, h:mm a")}</span>
          <button type="button" onClick={startEditing} aria-label="Edit" className="text-sage hover:text-ink">
            <EditIcon className="h-4 w-4" />
          </button>
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
