import { useState } from "react";
import Modal from "../ui/Modal";
import { PRIORITIES } from "../../config/constants";
import { recurringTasksRepo } from "../../db/repository";
import { TrashIcon } from "../icons";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const BASE_CHOICES = ["daily", "weekdays", "weekends", "weekly"];

export default function RecurringTaskEditModal({ template, tags, onClose, onRemove }) {
  const [form, setForm] = useState({
    title: template.title,
    time: template.time || "",
    duration: template.duration || "",
    priority: template.priority,
    category: template.category,
  });
  const isWeekly = template.recurrence.startsWith("weekly:");
  const [base, setBase] = useState(isWeekly ? "weekly" : template.recurrence);
  const [weekday, setWeekday] = useState(isWeekly ? template.recurrence.slice("weekly:".length) : "monday");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const recurrence = base === "weekly" ? `weekly:${weekday}` : base;
    await recurringTasksRepo.update(template.id, {
      title: form.title.trim(),
      time: form.time || null,
      duration: form.duration ? Number(form.duration) : null,
      priority: form.priority,
      category: form.category,
      recurrence,
    });
    onClose();
  }

  return (
    <Modal title="Edit recurring task" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <input
          autoFocus
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          placeholder="What are you doing?"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="time"
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
            className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
          <input
            type="number"
            min="0"
            value={form.duration}
            onChange={(e) => set("duration", e.target.value)}
            placeholder="min"
            className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Category</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => set("category", tag)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  form.category === tag ? "border-charcoal bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => set("priority", p)}
                className={`flex-1 rounded-full border py-2 text-xs font-bold ${
                  form.priority === p ? "border-red bg-red text-white" : "border-sage/30 bg-surface text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Repeat</label>
          <div className="flex flex-wrap gap-2">
            {BASE_CHOICES.map((choice) => (
              <button
                type="button"
                key={choice}
                onClick={() => setBase(choice)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${
                  base === choice ? "border-charcoal bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
          {base === "weekly" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setWeekday(d)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${
                    weekday === d ? "border-red bg-red text-white" : "border-sage/30 bg-surface text-ink"
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => onRemove(template)}
            aria-label="Delete recurring task"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sage/30 bg-surface text-red"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
          <button type="submit" className="h-12 flex-1 rounded-2xl bg-charcoal text-sm font-bold text-white">
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
