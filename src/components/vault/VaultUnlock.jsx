import { useEffect, useState } from "react";
import { unlockVault, isBiometricEnabled, isBiometricSupported, unlockWithBiometric } from "../../db/vaultRepository";
import { KeyIcon, FaceIdIcon } from "../icons";

function digitsOnly(v) {
  return v.replace(/\D/g, "").slice(0, 4);
}

export default function VaultUnlock({ onUnlocked }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [lockedForSeconds, setLockedForSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [enabled, supported] = await Promise.all([isBiometricEnabled(), isBiometricSupported()]);
      setBiometricReady(enabled && supported);
    })();
  }, []);

  useEffect(() => {
    if (lockedForSeconds <= 0) return;
    const t = setInterval(() => setLockedForSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockedForSeconds]);

  async function submit(e) {
    e.preventDefault();
    if (code.length !== 4 || busy || lockedForSeconds > 0) return;
    setBusy(true);
    setError("");
    const result = await unlockVault(code);
    setBusy(false);
    if (result.ok) {
      onUnlocked();
    } else if (result.lockedForSeconds) {
      setLockedForSeconds(result.lockedForSeconds);
      setError("Too many attempts. Try again shortly.");
    } else {
      setError("Wrong code.");
      setCode("");
    }
  }

  async function tryBiometric() {
    if (busy || lockedForSeconds > 0) return;
    setBusy(true);
    setError("");
    try {
      const result = await unlockWithBiometric();
      if (result.ok) {
        onUnlocked();
      } else if (result.lockedForSeconds) {
        setLockedForSeconds(result.lockedForSeconds);
        setError("Too many attempts. Try again shortly.");
      } else {
        setError("Face ID didn't match. Use your code instead.");
      }
    } catch (err) {
      setError(err.message || "Face ID unlock failed. Use your code instead.");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 px-6 pt-20 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/20">
        <KeyIcon className="h-7 w-7 text-ink" />
      </span>
      <h1 className="text-2xl font-black text-ink">Vault is locked</h1>

      {biometricReady && (
        <button
          type="button"
          onClick={tryBiometric}
          disabled={busy || lockedForSeconds > 0}
          className="mx-auto flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-50"
        >
          <FaceIdIcon className="h-5 w-5" />
          Unlock with Face ID
        </button>
      )}

      <form onSubmit={submit} className="space-y-3 text-left">
        {biometricReady && <p className="text-center text-[11px] font-bold uppercase tracking-wide text-sage">Or enter your code</p>}
        <input
          type="password"
          inputMode="numeric"
          autoFocus={!biometricReady}
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(digitsOnly(e.target.value))}
          placeholder="••••"
          disabled={lockedForSeconds > 0}
          className="h-12 w-full rounded-2xl border border-sage/30 bg-surface px-4 text-center text-lg font-black tracking-[0.5em] text-ink focus:border-ink focus:outline-none disabled:opacity-50"
        />
        {error && (
          <p className="text-center text-xs font-semibold text-red">
            {error}
            {lockedForSeconds > 0 ? ` (${lockedForSeconds}s)` : ""}
          </p>
        )}
        <button
          type="submit"
          disabled={code.length !== 4 || busy || lockedForSeconds > 0}
          className="h-12 w-full rounded-2xl border border-sage/30 bg-surface text-sm font-bold text-ink disabled:opacity-40"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
