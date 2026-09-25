import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import BackHeader from "../components/layout/BackHeader";
import VaultSetup from "../components/vault/VaultSetup";
import VaultUnlock from "../components/vault/VaultUnlock";
import VaultSettingsPanel from "../components/vault/VaultSettingsPanel";
import CredentialCard from "../components/vault/CredentialCard";
import CredentialFormModal from "../components/vault/CredentialFormModal";
import { useJournalAutoLock } from "../hooks/useJournalAutoLock";
import { isVaultSetUp, isVaultUnlocked, lockVault, vaultRepo } from "../db/vaultRepository";
import { VAULT_AUTO_LOCK_MINUTES } from "../config/constants";
import { LockIcon, GearIcon, PlusIcon } from "../components/icons";

function UnlockedVaultView({ onLock }) {
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const entries = useLiveQuery(() => vaultRepo.listMeta(), [refreshKey]) || [];

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function openEntry(id) {
    const full = await vaultRepo.getDecrypted(id);
    setEditingEntry(full);
    setFormOpen(true);
  }

  function openNew() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  async function save(values) {
    if (editingEntry) await vaultRepo.update(editingEntry.id, values);
    else await vaultRepo.create(values);
    setFormOpen(false);
    bump();
  }

  async function remove(id) {
    await vaultRepo.remove(id);
    setFormOpen(false);
    bump();
  }

  return (
    <div className="space-y-5">
      <BackHeader
        to="/settings"
        eyebrow="Just for you"
        title="Vault"
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              aria-label="Vault settings"
              className="grid h-11 w-11 place-items-center rounded-full bg-surface shadow-soft"
            >
              <GearIcon className="h-4 w-4 text-ink" />
            </button>
            <button
              type="button"
              onClick={onLock}
              className="flex h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-xs font-bold text-ink shadow-soft"
            >
              <LockIcon className="h-4 w-4" /> Lock now
            </button>
          </>
        }
      />

      <div className="space-y-4 px-5">
        {showSettings ? (
          <VaultSettingsPanel onCleared={onLock} />
        ) : (
          <>
            <button
              type="button"
              onClick={openNew}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-charcoal text-sm font-bold text-white"
            >
              <PlusIcon className="h-4 w-4" /> Add credential
            </button>

            {entries.length === 0 ? (
              <div className="rounded-card border border-dashed border-sage/40 bg-surface p-8 text-center text-sm font-semibold text-sage">
                No credentials saved yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {entries.map((entry) => (
                  <CredentialCard key={entry.id} entry={entry} onOpen={openEntry} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {formOpen && (
        <CredentialFormModal entry={editingEntry} onClose={() => setFormOpen(false)} onSave={save} onDelete={remove} />
      )}
    </div>
  );
}

export default function Vault() {
  const [status, setStatus] = useState("checking"); // checking | needsSetup | locked | unlocked

  useEffect(() => {
    (async () => {
      if (isVaultUnlocked()) {
        setStatus("unlocked");
        return;
      }
      setStatus((await isVaultSetUp()) ? "locked" : "needsSetup");
    })();
  }, []);

  const handleLock = useCallback(() => {
    lockVault();
    setStatus("locked");
  }, []);

  useJournalAutoLock(status === "unlocked", handleLock, VAULT_AUTO_LOCK_MINUTES * 60 * 1000);

  if (status === "checking") return null;
  if (status === "needsSetup") {
    return (
      <div className="space-y-5">
        <BackHeader to="/settings" eyebrow="Just for you" title="Vault" />
        <VaultSetup onDone={() => setStatus("unlocked")} />
      </div>
    );
  }
  if (status === "locked") {
    return (
      <div className="space-y-5">
        <BackHeader to="/settings" eyebrow="Just for you" title="Vault" />
        <VaultUnlock onUnlocked={() => setStatus("unlocked")} />
      </div>
    );
  }
  return <UnlockedVaultView onLock={handleLock} />;
}
