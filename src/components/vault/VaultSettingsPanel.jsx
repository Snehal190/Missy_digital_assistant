import { useEffect, useState } from "react";
import {
  changeVaultCode,
  vaultRepo,
  isBiometricEnabled,
  isBiometricSupported,
  enableBiometricUnlock,
  disableBiometricUnlock,
} from "../../db/vaultRepository";
import { TrashIcon, FaceIdIcon } from "../icons";

function digitsOnly(v) {
  return v.replace(/\D/g, "").slice(0, 4);
}

function ChangeCode() {
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(""); // "" | "busy" | "done" | error message

  const canSubmit = oldCode.length === 4 && newCode.length === 4 && newCode === confirm && status !== "busy";

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("busy");
    try {
      const { wasBiometricEnabled } = await changeVaultCode(oldCode, newCode);
      setStatus(wasBiometricEnabled ? "Code changed. Face ID quick-unlock was turned off — re-enable it below." : "Code changed.");
      setOldCode("");
      setNewCode("");
      setConfirm("");
    } catch (err) {
      setStatus(err.message || "Something went wrong.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={oldCode}
        onChange={(e) => setOldCode(digitsOnly(e.target.value))}
        placeholder="Current code"
        className="h-11 w-full rounded-2xl border border-sage/20 bg-base px-3 text-center text-sm font-black tracking-[0.4em] text-ink focus:border-sage/50 focus:outline-none"
      />
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={newCode}
        onChange={(e) => setNewCode(digitsOnly(e.target.value))}
        placeholder="New 4-digit code"
        className="h-11 w-full rounded-2xl border border-sage/20 bg-base px-3 text-center text-sm font-black tracking-[0.4em] text-ink focus:border-sage/50 focus:outline-none"
      />
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={confirm}
        onChange={(e) => setConfirm(digitsOnly(e.target.value))}
        placeholder="Confirm new code"
        className="h-11 w-full rounded-2xl border border-sage/20 bg-base px-3 text-center text-sm font-black tracking-[0.4em] text-ink focus:border-sage/50 focus:outline-none"
      />
      {status && status !== "busy" && (
        <p className={`text-xs font-semibold ${status.startsWith("Code changed") ? "text-ink" : "text-red"}`}>{status}</p>
      )}
      <button type="submit" disabled={!canSubmit} className="h-11 w-full rounded-2xl bg-charcoal text-xs font-bold text-white disabled:opacity-40">
        {status === "busy" ? "Changing…" : "Change code"}
      </button>
    </form>
  );
}

function BiometricToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setSupported(await isBiometricSupported());
      setEnabled(await isBiometricEnabled());
    })();
  }, []);

  async function confirmEnable(e) {
    e.preventDefault();
    if (code.length !== 4 || busy) return;
    setBusy(true);
    setError("");
    try {
      await enableBiometricUnlock(code);
      setEnabled(true);
      setConfirming(false);
      setCode("");
    } catch (err) {
      setError(err.message || "Couldn't turn on Face ID unlock.");
    }
    setBusy(false);
  }

  async function turnOff() {
    await disableBiometricUnlock();
    setEnabled(false);
  }

  if (!supported) {
    return (
      <p className="rounded-2xl bg-sage/10 p-3 text-xs font-semibold text-sage">
        Face ID/Touch ID quick-unlock isn't available on this device or browser. Your 4-digit code still works as
        normal.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FaceIdIcon className="h-5 w-5 text-ink" />
          <p className="text-sm font-bold text-ink">Face ID quick-unlock</p>
        </div>
        <button
          type="button"
          onClick={() => (enabled ? turnOff() : setConfirming(true))}
          className={`h-7 w-12 rounded-full transition-colors ${enabled ? "bg-red" : "bg-sage/30"}`}
        >
          <span className={`block h-6 w-6 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      {confirming && !enabled && (
        <form onSubmit={confirmEnable} className="space-y-2 rounded-2xl bg-sage/10 p-3">
          <p className="text-xs font-semibold text-ink">Enter your code once to link Face ID to it.</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(digitsOnly(e.target.value))}
            placeholder="••••"
            className="h-11 w-full rounded-2xl border border-sage/20 bg-surface px-3 text-center text-sm font-black tracking-[0.4em] text-ink focus:border-sage/50 focus:outline-none"
          />
          {error && <p className="text-xs font-semibold text-red">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => (setConfirming(false), setCode(""), setError(""))} className="h-9 flex-1 rounded-xl border border-sage/20 text-xs font-bold text-ink">
              Cancel
            </button>
            <button type="submit" disabled={code.length !== 4 || busy} className="h-9 flex-1 rounded-xl bg-charcoal text-xs font-bold text-white disabled:opacity-40">
              {busy ? "Confirming…" : "Turn on"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ClearVault({ onCleared }) {
  const [confirmStep, setConfirmStep] = useState(0);

  async function clear() {
    await vaultRepo.clearAll();
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
        <TrashIcon className="h-4 w-4" /> Delete entire vault
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl bg-red/5 p-3">
      <p className="text-xs font-bold text-red">
        This permanently deletes every saved credential and resets your code/Face ID setup. Not undoable.
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

export default function VaultSettingsPanel({ onCleared }) {
  return (
    <div className="space-y-4 rounded-card bg-surface p-5 shadow-soft">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sage">Change code</p>
        <ChangeCode />
      </div>
      <div className="h-px bg-sage/10" />
      <BiometricToggle />
      <div className="h-px bg-sage/10" />
      <ClearVault onCleared={onCleared} />
    </div>
  );
}
