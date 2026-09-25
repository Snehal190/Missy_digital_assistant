import { useState } from "react";
import { setupJournal } from "../../db/journalRepository";
import { LockIcon } from "../icons";

export default function JournalSetup({ onDone }) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = passphrase.length > 0 && passphrase.length < 8;
  const mismatch = confirm.length > 0 && passphrase !== confirm;
  const canSubmit = passphrase.length >= 8 && passphrase === confirm && understood && !busy;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await setupJournal(passphrase);
      onDone();
    } catch {
      setError("Something went wrong setting up the journal. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 px-6 pt-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/20">
        <LockIcon className="h-7 w-7 text-ink" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-ink">Set up your private space</h1>
        <p className="text-sm font-medium text-sage">
          Entries here are encrypted on this device with a passphrase only you know. Missy never sends this
          content anywhere — not to the cloud backup, not to any AI feature.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 text-left">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Passphrase</label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="At least 8 characters"
            className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
          {tooShort && <p className="mt-1 text-xs font-semibold text-red">At least 8 characters.</p>}
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Confirm passphrase</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
          {mismatch && <p className="mt-1 text-xs font-semibold text-red">Doesn't match.</p>}
        </div>

        <label className="flex items-start gap-2 rounded-2xl bg-sage/10 p-3 text-xs font-semibold text-ink">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-charcoal"
          />
          I understand there is no way to recover these entries if I forget this passphrase. There is no reset.
        </label>

        {error && <p className="text-xs font-semibold text-red">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Setting up…" : "Create my private space"}
        </button>
      </form>
    </div>
  );
}
