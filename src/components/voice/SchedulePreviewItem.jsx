import { TrashIcon } from "../icons";
import { PRIORITIES } from "../../config/constants";

export default function SchedulePreviewItem({ item, index, tags, onChange, onRemove, onMove }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (!Number.isNaN(from)) onMove(from, index);
      }}
      className="rounded-2xl border border-sage/30 bg-surface p-3"
    >
      <div className="flex items-start gap-2">
        <span className="mt-2 cursor-grab select-none text-sage" aria-hidden>
          ⠿
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={item.title}
            onChange={(e) => onChange({ ...item, title: e.target.value })}
            className="w-full rounded-xl border border-sage/30 bg-base px-3 py-2 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="time"
              value={item.time || ""}
              onChange={(e) => onChange({ ...item, time: e.target.value })}
              className="h-9 rounded-xl border border-sage/30 bg-base px-2 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
            />
            <input
              type="number"
              min="0"
              value={item.duration || ""}
              onChange={(e) => onChange({ ...item, duration: e.target.value ? Number(e.target.value) : null })}
              placeholder="min"
              className="h-9 w-16 rounded-xl border border-sage/30 bg-base px-2 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
            />
            <select
              value={item.category}
              onChange={(e) => onChange({ ...item, category: e.target.value })}
              className="h-9 rounded-xl border border-sage/30 bg-base px-2 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
            >
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={item.priority}
              onChange={(e) => onChange({ ...item, priority: e.target.value })}
              className="h-9 rounded-xl border border-sage/30 bg-base px-2 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sage hover:text-red"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
