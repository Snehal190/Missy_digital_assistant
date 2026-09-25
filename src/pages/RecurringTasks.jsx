import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import PageHeader from "../components/layout/PageHeader";
import RecurringTaskEditModal from "../components/recurring/RecurringTaskEditModal";
import { recurringTasksRepo, settingsRepo } from "../db/repository";
import { describeRecurrence } from "../lib/recurrence";
import { emojiFor } from "../lib/categoryIcons";
import { TrashIcon } from "../components/icons";

export default function RecurringTasks() {
  const templates = useLiveQuery(() => recurringTasksRepo.list(), []) || [];
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  const tags = settings?.tagList || [];
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  return (
    <div className="space-y-5 pb-6">
      <PageHeader eyebrow="Automate" title="Recurring" />

      <div className="space-y-2.5 px-5">
        {templates.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-sage/40 p-6 text-center text-sm font-semibold text-sage">
            No recurring tasks yet — set "Repeat" when creating a new task on Today.
          </div>
        )}
        {templates.map((t) => (
          <div key={t.id} className={`rounded-[1.5rem] border border-sage/30 bg-surface p-3 ${t.paused ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setEditing(t)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-charcoal/10 text-xl">
                  {emojiFor(t.category)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold text-ink">{t.title}</span>
                  <span className="text-xs font-semibold text-sage">
                    {describeRecurrence(t.recurrence)}
                    {t.time ? ` · ${t.time}` : ""}
                    {t.paused ? " · Paused" : ""}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => recurringTasksRepo.setPaused(t.id, !t.paused)}
                className="h-9 shrink-0 rounded-full border border-sage/30 bg-base px-3 text-[11px] font-bold text-ink"
              >
                {t.paused ? "Resume" : "Pause"}
              </button>
              {confirmDeleteId === t.id ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="h-9 rounded-full border border-sage/30 bg-base px-2 text-[11px] font-bold text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      recurringTasksRepo.remove(t.id);
                      setConfirmDeleteId(null);
                    }}
                    className="h-9 rounded-full bg-red px-2 text-[11px] font-bold text-white"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(t.id)}
                  aria-label="Delete"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sage hover:text-red"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <RecurringTaskEditModal
          template={editing}
          tags={tags}
          onClose={() => setEditing(null)}
          onRemove={(t) => {
            recurringTasksRepo.remove(t.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
