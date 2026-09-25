import { useState } from "react";
import Modal from "../ui/Modal";
import { saveTodayAsTemplate } from "../../db/repository";

export default function SaveTemplateModal({ taskCount, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await saveTodayAsTemplate(name.trim());
    onSaved();
  }

  return (
    <Modal title="Save today as template" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs font-semibold text-sage">
          Captures today's {taskCount} task{taskCount === 1 ? "" : "s"} — titles, times, durations, priorities and
          categories, not their completion status.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Deep work day"
          className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={!name.trim() || busy || taskCount === 0}
          className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save template"}
        </button>
      </form>
    </Modal>
  );
}
