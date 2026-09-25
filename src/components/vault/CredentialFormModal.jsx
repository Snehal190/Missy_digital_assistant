import { useState } from "react";
import Modal from "../ui/Modal";
import { TrashIcon } from "../icons";

export default function CredentialFormModal({ entry, onClose, onSave, onDelete }) {
  const [label, setLabel] = useState(entry?.label || "");
  const [username, setUsername] = useState(entry?.username || "");
  const [password, setPassword] = useState(entry?.password || "");
  const [url, setUrl] = useState(entry?.url || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = label.trim().length > 0;

  function submit(e) {
    e.preventDefault();
    if (!canSave) return;
    onSave({ label: label.trim(), username, password, url, notes });
  }

  return (
    <Modal title={entry ? "Edit credential" : "New credential"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Label</label>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Supabase"
            className="h-11 w-full rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Username / email</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 w-full rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Password</label>
          <div className="flex gap-2">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 flex-1 rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="h-11 shrink-0 rounded-2xl border border-sage/30 bg-surface px-3 text-xs font-bold text-ink"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">URL (optional)</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="h-11 w-full rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-2xl border border-sage/30 bg-surface px-3 py-2 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
        </div>

        <button type="submit" disabled={!canSave} className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-40">
          Save
        </button>

        {entry && (
          confirmDelete ? (
            <div className="flex gap-2 rounded-2xl border border-red/30 bg-red/5 p-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 flex-1 rounded-xl border border-sage/30 bg-surface text-xs font-bold text-ink">
                Cancel
              </button>
              <button type="button" onClick={() => onDelete(entry.id)} className="h-10 flex-1 rounded-xl bg-red text-xs font-bold text-white">
                Delete credential
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red/30 text-xs font-bold text-red"
            >
              <TrashIcon className="h-4 w-4" /> Delete credential
            </button>
          )
        )}
      </form>
    </Modal>
  );
}
