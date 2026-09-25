import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import BottomNav from "./components/layout/BottomNav";
import VoicePlanner from "./components/voice/VoicePlanner";
import Today from "./pages/Today";
import Ideas from "./pages/Ideas";
import Vocabulary from "./pages/Vocabulary";
import Review from "./pages/Review";
import Settings from "./pages/Settings";
import Wellness from "./pages/Wellness";
import Private from "./pages/Private";
import RecurringTasks from "./pages/RecurringTasks";
import History from "./pages/History";
import HistoryDay from "./pages/HistoryDay";
import Vault from "./pages/Vault";
import { settingsRepo, materializeRecurringTasksIfNeeded, backfillVocabSrsIfNeeded, tasksRepo } from "./db/repository";
import { useTheme } from "./hooks/useTheme";
import { useReminderScheduler } from "./hooks/useReminderScheduler";
import { startSyncQueueEngine } from "./db/syncQueue";
import { todayStr } from "./lib/dates";

export default function App() {
  const [voiceOpen, setVoiceOpen] = useState(false);
  useTheme();

  const todaysTasks = useLiveQuery(() => tasksRepo.listByDate(todayStr()), []) || [];
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  useReminderScheduler(todaysTasks, settings);

  useEffect(() => {
    (async () => {
      await settingsRepo.ensureSeeded();
      await materializeRecurringTasksIfNeeded();
      await backfillVocabSrsIfNeeded();
    })();
    startSyncQueueEngine();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-base pb-28">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/ideas" element={<Ideas />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/review" element={<Review />} />
        <Route path="/wellness" element={<Wellness />} />
        <Route path="/private" element={<Private />} />
        <Route path="/recurring" element={<RecurringTasks />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:date" element={<HistoryDay />} />
        <Route path="/vault" element={<Vault />} />
      </Routes>

      <BottomNav onVoicePlan={() => setVoiceOpen(true)} />

      {voiceOpen && (
        <VoicePlanner onClose={() => setVoiceOpen(false)} onSaved={() => setVoiceOpen(false)} />
      )}
    </div>
  );
}
