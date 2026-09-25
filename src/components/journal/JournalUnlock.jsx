import { useEffect, useState } from "react";
import { unlockJournal } from "../../db/journalRepository";
import { LockIcon } from "../icons";

export default function JournalUnlock({ onUnlocked }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [lockedForSeconds, setLockedForSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (lockedForSeconds <= 0) return;
    const t = setInterval(() => setLockedForSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockedForSeconds]);

  async function submit(e) {
    e.preventDefault();
    if (!passphrase || busy || lockedForSeconds > 0) return;
    setBusy(true);
    setError("");
    const result = await unlockJournal(passphrase);
    setBusy(false);
    if (result.ok) {
      onUnlocked();
    } else if (result.lockedForSeconds) {
      setLockedForSeconds(result.lockedForSeconds);
      setError("Too many attempts. Try again shortly.");
    } else {
      setError("Wrong passphrase.");
      setPassphrase("");
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 px-6 pt-20 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/20">
        <LockIcon className="h-7 w-7 text-ink" />
      </span>
      <h1 className="text-2xl font-black text-ink">Private space is locked</h1>

      <form onSubmit={submit} className="space-y-3 text-left">
        <input
          type="password"
          autoFocus
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Passphrase"
          disabled={lockedForSeconds > 0}
          className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-center text-sm font-semibold text-ink focus:border-ink focus:outline-none disabled:opacity-50"
        />
        {error && (
          <p className="text-center text-xs font-semibold text-red">
            {error}
            {lockedForSeconds > 0 ? ` (${lockedForSeconds}s)` : ""}
          </p>
        )}
        <button
          type="submit"
          disabled={!passphrase || busy || lockedForSeconds > 0}
          className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
