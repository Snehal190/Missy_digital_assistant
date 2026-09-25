import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import JournalSetup from "../components/journal/JournalSetup";
import JournalUnlock from "../components/journal/JournalUnlock";
import JournalComposer from "../components/journal/JournalComposer";
import JournalEntryList from "../components/journal/JournalEntryList";
import MoodChart from "../components/journal/MoodChart";
import JournalSettingsPanel from "../components/journal/JournalSettingsPanel";
import { useJournalAutoLock } from "../hooks/useJournalAutoLock";
import { isJournalSetUp, isJournalUnlocked, lockJournal, journalRepo } from "../db/journalRepository";
import { JOURNAL_AUTO_LOCK_MINUTES } from "../config/constants";
import { LockIcon, GearIcon } from "../components/icons";

function UnlockedJournalView({ onLock }) {
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const entries = useLiveQuery(() => journalRepo.listDecrypted(), [refreshKey]) || [];

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between px-5 pt-14">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sage">Just for you</p>
          <h1 className="mt-1 text-[28px] font-black leading-tight text-ink">Private</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Journal settings"
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
        </div>
      </header>

      <div className="space-y-4 px-5">
        {showSettings ? (
          <JournalSettingsPanel onCleared={onLock} />
        ) : (
          <>
            <JournalComposer
              onSave={async (entry) => {
                await journalRepo.create(entry);
                bump();
              }}
            />
            <MoodChart entries={entries} />
            <JournalEntryList entries={entries} onChanged={bump} />
          </>
        )}
      </div>
    </div>
  );
}

export default function Private() {
  const [status, setStatus] = useState("checking"); // checking | needsSetup | locked | unlocked

  useEffect(() => {
    (async () => {
      if (isJournalUnlocked()) {
        setStatus("unlocked");
        return;
      }
      setStatus((await isJournalSetUp()) ? "locked" : "needsSetup");
    })();
  }, []);

  const handleLock = useCallback(() => {
    lockJournal();
    setStatus("locked");
  }, []);

  useJournalAutoLock(status === "unlocked", handleLock, JOURNAL_AUTO_LOCK_MINUTES * 60 * 1000);

  if (status === "checking") return null;
  if (status === "needsSetup") return <JournalSetup onDone={() => setStatus("unlocked")} />;
  if (status === "locked") return <JournalUnlock onUnlocked={() => setStatus("unlocked")} />;
  return <UnlockedJournalView onLock={handleLock} />;
}
