import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import PageHeader from "../components/layout/PageHeader";
import SleepComposer from "../components/sleep/SleepComposer";
import SleepTrendChart from "../components/sleep/SleepTrendChart";
import SleepInsightCard from "../components/sleep/SleepInsightCard";
import ScreenTimeTracker from "../components/screentime/ScreenTimeTracker";
import ScreenTimeTrendChart from "../components/screentime/ScreenTimeTrendChart";
import BentoMetric from "../components/ui/BentoMetric";
import { sleepRepo, screenTimeRepo, settingsRepo } from "../db/repository";
import { todayStr, formatFriendly } from "../lib/dates";
import { MoonIcon, HourglassIcon } from "../components/icons";

const TABS = [
  { key: "sleep", label: "Sleep", Icon: MoonIcon },
  { key: "screen", label: "Screen time", Icon: HourglassIcon },
];

export default function Wellness() {
  const [tab, setTab] = useState("sleep");
  const date = todayStr();

  const sleepEntries = useLiveQuery(() => sleepRepo.recent(14), []) || [];
  const todaySleep = useLiveQuery(() => sleepRepo.get(date), [date]);
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  const screenEntries = useLiveQuery(() => screenTimeRepo.recent(14), []) || [];
  const todayScreen = useLiveQuery(() => screenTimeRepo.get(date), [date]);

  const avgHours = sleepEntries.length
    ? Math.round((sleepEntries.reduce((s, e) => s + (e.hours || 0), 0) / sleepEntries.length) * 10) / 10
    : null;

  if (!settings || todayScreen === undefined) return null;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Habits" title="Wellness" />

      <div className="flex gap-2 px-5">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-bold ${
              tab === key ? "border-transparent bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "sleep" && (
        <div className="space-y-4 px-5">
          <SleepComposer existing={todaySleep} onSave={(vals) => sleepRepo.upsert(date, vals)} />

          {avgHours !== null && (
            <div className="grid grid-cols-2 gap-3">
              <BentoMetric label="Avg hours (14d)" value={avgHours} Icon={MoonIcon} />
              <BentoMetric label="Nights logged" value={sleepEntries.length} Icon={MoonIcon} />
            </div>
          )}

          {sleepEntries.length > 0 && <SleepTrendChart entries={sleepEntries} />}

          <SleepInsightCard entries={sleepEntries} />
        </div>
      )}

      {tab === "screen" && (
        <div className="space-y-4 px-5">
          <ScreenTimeTracker today={todayScreen} limitMinutes={settings.screenTimeLimitMinutes} date={date} />

          <p className="rounded-2xl bg-sage/20 p-3 text-xs font-semibold text-ink">
            Neither Instagram nor iOS exposes app usage to outside apps like this one, so this is self-logged — tap
            the quick-add buttons as you use the app, or copy today's number from iPhone Settings → Screen Time →
            Instagram. For real-time OS reminders, also set a native limit: Settings → Screen Time → App Limits →
            Instagram → 60 min.
          </p>

          {screenEntries.length > 0 && (
            <ScreenTimeTrendChart entries={screenEntries} limitMinutes={settings.screenTimeLimitMinutes} />
          )}

          {screenEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-sage">Past days</p>
              {[...screenEntries].reverse().map((e) => (
                <div key={e.date} className="flex items-center justify-between rounded-[1.5rem] border border-sage/30 bg-surface p-3">
                  <p className="text-sm font-bold text-ink">{formatFriendly(e.date)}</p>
                  <p className={`text-sm font-black ${e.minutes > settings.screenTimeLimitMinutes ? "text-red" : "text-ink"}`}>
                    {e.minutes} min
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
