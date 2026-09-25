import { useState } from "react";
import Modal from "../ui/Modal";
import { PRIORITIES, TASK_STATUSES } from "../../config/constants";
import { RECURRENCE_CHOICES, dayNameFor, describeRecurrence } from "../../lib/recurrence";
import { todayStr } from "../../lib/dates";
import { TrashIcon } from "../icons";

export default function TaskFormModal({ task, tags, defaultRemindMe = true, onClose, onSave, onDelete }) {
  const isEdit = Boolean(task?.id);
  const [form, setForm] = useState({
    title: task?.title || "",
    time: task?.time || "",
    duration: task?.duration || "",
    priority: task?.priority || "Medium",
    category: task?.category || tags[0] || "Personal",
    status: task?.status || "Not started",
    remindMe: task?.remindMe ?? defaultRemindMe,
  });
  // Recurrence can only be set at creation — see repository.js's comment on
  // why editing an existing/materialized instance never touches its template.
  const [recurrence, setRecurrence] = useState(null);
  const todayWeeklyValue = `weekly:${dayNameFor(todayStr())}`;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(
      {
        ...form,
        time: form.time || null,
        duration: form.duration ? Number(form.duration) : null,
        remindMe: form.time ? form.remindMe : false,
      },
      recurrence,
    );
  }

  return (
    <Modal title={isEdit ? "Edit task" : "New task"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Title</label>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
            placeholder="What are you doing?"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Time</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
              className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">
              Duration (min)
            </label>
            <input
              type="number"
              min="0"
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
              placeholder="30"
            />
          </div>
        </div>

        {form.time && (
          <button
            type="button"
            onClick={() => set("remindMe", !form.remindMe)}
            className={`flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-sm font-bold ${
              form.remindMe ? "border-charcoal bg-charcoal/5 text-ink" : "border-sage/30 bg-surface text-sage"
            }`}
          >
            <span>Remind me</span>
            <span
              className={`grid h-5 w-9 items-center rounded-full px-0.5 ${form.remindMe ? "bg-red justify-end" : "bg-sage/30 justify-start"}`}
            >
              <span className="h-4 w-4 rounded-full bg-white" />
            </span>
          </button>
        )}

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

        {!isEdit && (
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Repeat</label>
            <div className="flex flex-wrap gap-2">
              {RECURRENCE_CHOICES.map((choice) => {
                const value = choice.value === "weekly" ? todayWeeklyValue : choice.value;
                const active = recurrence === value;
                return (
                  <button
                    type="button"
                    key={choice.label}
                    onClick={() => setRecurrence(value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      active ? "border-charcoal bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
                    }`}
                  >
                    {choice.value === "weekly" ? describeRecurrence(todayWeeklyValue) : choice.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isEdit && (
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Status</label>
            <div className="flex flex-wrap gap-2">
              {TASK_STATUSES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => set("status", s)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    form.status === s ? "border-charcoal bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {isEdit && (
            <button
              type="button"
              onClick={() => onDelete(task)}
              aria-label="Delete task"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sage/30 bg-surface text-red"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <button type="submit" className="h-12 flex-1 rounded-2xl bg-red text-sm font-bold text-white shadow-red-glow">
            {isEdit ? "Save changes" : "Add task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
