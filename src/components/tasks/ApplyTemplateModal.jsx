import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Modal from "../ui/Modal";
import { templatesRepo, applyTemplate } from "../../db/repository";

export default function ApplyTemplateModal({ hasExistingTasks, onClose, onApplied }) {
  const templates = useLiveQuery(() => templatesRepo.list(), []) || [];
  const [pendingId, setPendingId] = useState(null); // template chosen, waiting on merge/replace if needed
  const [busy, setBusy] = useState(false);

  async function apply(id, mode) {
    setBusy(true);
    await applyTemplate(id, { mode });
    onApplied();
  }

  function choose(id) {
    if (hasExistingTasks) setPendingId(id);
    else apply(id, "merge");
  }

  if (pendingId) {
    const template = templates.find((t) => t.id === pendingId);
    return (
      <Modal title="Apply template" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink">
            You already have tasks today. Add "{template?.name}" alongside them, or replace today's list entirely?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingId(null)}
              className="h-12 flex-1 rounded-2xl border border-sage/30 bg-surface text-sm font-bold text-ink"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => apply(pendingId, "merge")}
              disabled={busy}
              className="h-12 flex-1 rounded-2xl border border-sage/30 bg-surface text-sm font-bold text-ink disabled:opacity-50"
            >
              Merge
            </button>
            <button
              type="button"
              onClick={() => apply(pendingId, "replace")}
              disabled={busy}
              className="h-12 flex-1 rounded-2xl bg-red text-sm font-bold text-white shadow-red-glow disabled:opacity-50"
            >
              Replace
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Apply a template" onClose={onClose}>
      {templates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-sage/40 p-6 text-center text-sm font-semibold text-sage">
          No templates saved yet — use "Save today as template" once you've planned a day worth reusing.
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => choose(t.id)}
              disabled={busy}
              className="flex w-full items-center justify-between rounded-[1.5rem] border border-sage/30 bg-surface p-4 text-left disabled:opacity-50"
            >
              <span className="font-bold text-ink">{t.name}</span>
              <span className="text-xs font-semibold text-sage">
                {t.tasks.length} task{t.tasks.length === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
