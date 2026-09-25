import { useState } from "react";
import { changeJournalPassphrase, unlockJournal, journalRepo } from "../../db/journalRepository";
import { DownloadIcon, TrashIcon } from "../icons";

function ChangePassphrase() {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(""); // "" | "busy" | "done" | error message

  const canSubmit = oldPass && newPass.length >= 8 && newPass === confirm && status !== "busy";

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("busy");
    try {
      await changeJournalPassphrase(oldPass, newPass);
      setStatus("done");
      setOldPass("");
      setNewPass("");
      setConfirm("");
    } catch (err) {
      setStatus(err.message || "Something went wrong.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="password"
        value={oldPass}
        onChange={(e) => setOldPass(e.target.value)}
        placeholder="Current passphrase"
        className="h-11 w-full rounded-2xl border border-sage/20 bg-base px-3 text-sm font-semibold text-ink focus:border-sage/50 focus:outline-none"
      />
      <input
        type="password"
        value={newPass}
        onChange={(e) => setNewPass(e.target.value)}
        placeholder="New passphrase (min 8 characters)"
        className="h-11 w-full rounded-2xl border border-sage/20 bg-base px-3 text-sm font-semibold text-ink focus:border-sage/50 focus:outline-none"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new passphrase"
        className="h-11 w-full rounded-2xl border border-sage/20 bg-base px-3 text-sm font-semibold text-ink focus:border-sage/50 focus:outline-none"
      />
      {status === "done" && <p className="text-xs font-semibold text-ink">Passphrase changed.</p>}
      {status && status !== "busy" && status !== "done" && <p className="text-xs font-semibold text-red">{status}</p>}
      <button type="submit" disabled={!canSubmit} className="h-11 w-full rounded-2xl bg-charcoal text-xs font-bold text-white disabled:opacity-40">
        {status === "busy" ? "Changing…" : "Change passphrase"}
      </button>
    </form>
  );
}

function ExportJournal() {
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function doExport(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await unlockJournal(passphrase);
    if (!result.ok) {
      setBusy(false);
      setError(result.lockedForSeconds ? "Too many attempts. Try again shortly." : "Wrong passphrase.");
      return;
    }
    const entries = await journalRepo.exportAllDecrypted();
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `missy-journal-plaintext-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
    setOpen(false);
    setPassphrase("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sage/20 text-xs font-bold text-ink"
      >
        <DownloadIcon className="h-4 w-4" /> Export private journal
      </button>
    );
  }

  return (
    <form onSubmit={doExport} className="space-y-2 rounded-2xl bg-red/5 p-3">
      <p className="text-xs font-bold text-red">
        This exports an UNENCRYPTED plaintext file. Re-enter your passphrase to confirm.
      </p>
      <input
        type="password"
        autoFocus
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        placeholder="Passphrase"
        className="h-10 w-full rounded-xl border border-sage/20 bg-surface px-3 text-sm font-semibold text-ink focus:border-sage/50 focus:outline-none"
      />
      {error && <p className="text-xs font-semibold text-red">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="h-9 flex-1 rounded-xl border border-sage/20 text-xs font-bold text-ink">
          Cancel
        </button>
        <button type="submit" disabled={!passphrase || busy} className="h-9 flex-1 rounded-xl bg-red text-xs font-bold text-white disabled:opacity-40">
          {busy ? "Exporting…" : "Export plaintext"}
        </button>
      </div>
    </form>
  );
}

function ClearJournal({ onCleared }) {
  const [confirmStep, setConfirmStep] = useState(0);

  async function clear() {
    await journalRepo.clearAll();
    setConfirmStep(0);
    onCleared();
  }

  if (confirmStep === 0) {
    return (
      <button
        type="button"
        onClick={() => setConfirmStep(1)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red/30 text-xs font-bold text-red"
      >
        <TrashIcon className="h-4 w-4" /> Delete entire private journal
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl bg-red/5 p-3">
      <p className="text-xs font-bold text-red">
        This permanently deletes every private entry and resets your passphrase setup. This is separate from
        "Clear all data" in Settings and is not undoable.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setConfirmStep(0)} className="h-9 flex-1 rounded-xl border border-sage/20 text-xs font-bold text-ink">
          Cancel
        </button>
        <button type="button" onClick={clear} className="h-9 flex-1 rounded-xl bg-red text-xs font-bold text-white">
          Yes, delete everything
        </button>
      </div>
    </div>
  );
}

export default function JournalSettingsPanel({ onCleared }) {
  return (
    <div className="space-y-4 rounded-card bg-surface p-5 shadow-soft">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sage">Change passphrase</p>
        <ChangePassphrase />
      </div>
      <div className="h-px bg-sage/10" />
      <ExportJournal />
      <ClearJournal onCleared={onCleared} />
    </div>
  );
}
