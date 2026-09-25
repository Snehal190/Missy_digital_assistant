import { useState } from "react";
import { setupVault } from "../../db/vaultRepository";
import { KeyIcon } from "../icons";

function digitsOnly(v) {
  return v.replace(/\D/g, "").slice(0, 4);
}

export default function VaultSetup({ onDone }) {
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length === 4 && code !== confirm;
  const canSubmit = code.length === 4 && code === confirm && understood && !busy;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await setupVault(code);
      onDone();
    } catch {
      setError("Something went wrong setting up the vault. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 px-6 pt-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/20">
        <KeyIcon className="h-7 w-7 text-ink" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-ink">Set up your credentials vault</h1>
        <p className="text-sm font-medium text-sage">
          Pick a 4-digit code to encrypt this vault on this device. Missy never sends it anywhere — not to cloud
          backup, not to any AI feature. You can turn on Face ID as a faster unlock afterward, but the code always
          works too.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 text-left">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">4-digit code</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(digitsOnly(e.target.value))}
            placeholder="••••"
            className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-center text-lg font-black tracking-[0.5em] text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Confirm code</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(digitsOnly(e.target.value))}
            placeholder="••••"
            className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-center text-lg font-black tracking-[0.5em] text-ink focus:border-ink focus:outline-none"
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
          I understand there is no way to recover these credentials if I forget this code. There is no reset.
        </label>

        {error && <p className="text-xs font-semibold text-red">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Setting up…" : "Create my vault"}
        </button>
      </form>
    </div>
  );
}
