import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { settingsRepo, exportAllData, clearAllData, clearDataForDate, forceFullResync } from "../db/repository";
import { todayStr } from "../lib/dates";
import { useTheme } from "../hooks/useTheme";
import { useAuthSession } from "../hooks/useAuthSession";
import { useNotify } from "../hooks/useNotify";
import { supabase } from "../db/supabaseClient";
import { signInWithEmail, signOut } from "../db/auth";
import { PlusIcon, TrashIcon, DownloadIcon, SunIcon, MoonIcon, SyncIcon, CloudOffIcon } from "../components/icons";

const THEME_OPTIONS = [
  { key: "light", label: "Light", Icon: SunIcon },
  { key: "dark", label: "Dark", Icon: MoonIcon },
];

function Section({ title, children }) {
  return (
    <section className="mx-5 space-y-3 rounded-card bg-surface p-5 shadow-soft">
      <h2 className="text-sm font-black uppercase tracking-wide text-ink">{title}</h2>
      {children}
    </section>
  );
}

function TagEditor({ label, tags, onChange }) {
  const [value, setValue] = useState("");

  function add() {
    const v = value.trim();
    if (!v || tags.includes(v)) return;
    onChange([...tags, v]);
    setValue("");
  }
  function remove(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sage">{label}</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full border border-sage/30 bg-base px-3 py-1.5 text-xs font-bold text-ink">
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>
              <TrashIcon className="h-3 w-3 text-sage hover:text-red" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add tag…"
          className="h-10 flex-1 rounded-2xl border border-sage/30 bg-base px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
        />
        <button type="button" onClick={add} className="grid h-10 w-10 place-items-center rounded-full bg-charcoal text-white">
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CloudBackupSection({ resyncStatus, onForceResync }) {
  const { user, ready } = useAuthSession();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error message

  if (!supabase) {
    return (
      <Section title="Cloud backup">
        <p className="text-xs font-semibold text-sage">
          Not configured for this build — the app runs fully local-only. See the README to add Supabase.
        </p>
      </Section>
    );
  }
  if (!ready) return null;

  async function send(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      await signInWithEmail(email);
      setStatus("sent");
    } catch (err) {
      setStatus(err.message || "Something went wrong.");
    }
  }

  return (
    <Section title="Cloud backup">
      {user ? (
        <>
          <p className="text-xs font-semibold text-sage">
            Signed in as <span className="font-bold text-ink">{user.email}</span>. Your history syncs to Supabase
            in the background.
          </p>
          <button
            type="button"
            onClick={onForceResync}
            disabled={resyncStatus === "busy"}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sage/30 bg-base text-sm font-bold text-ink disabled:opacity-50"
          >
            <SyncIcon className="h-4 w-4" />
            {resyncStatus === "busy" ? "Queuing everything…" : resyncStatus === "done" ? "Queued — check backup status" : "Force full resync"}
          </button>
          <button type="button" onClick={() => signOut()} className="h-11 w-full rounded-2xl border border-sage/30 bg-base text-sm font-bold text-ink">
            Sign out
          </button>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 text-xs font-semibold text-sage">
            <CloudOffIcon className="h-4 w-4 shrink-0" />
            Signed out — everything stays local-only on this device. Sign in to also back up to the cloud.
          </p>
          <form onSubmit={send} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 flex-1 rounded-2xl border border-sage/30 bg-base px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              disabled={!email || status === "sending"}
              className="h-11 shrink-0 rounded-2xl bg-charcoal px-4 text-xs font-bold text-white disabled:opacity-40"
            >
              {status === "sending" ? "Sending…" : "Send link"}
            </button>
          </form>
          {status === "sent" && (
            <p className="text-xs font-semibold text-ink">Check your email for a sign-in link.</p>
          )}
          {status !== "idle" && status !== "sending" && status !== "sent" && (
            <p className="text-xs font-semibold text-red">{status}</p>
          )}
        </>
      )}
    </Section>
  );
}

function WeightSlider({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold text-ink">
        <span>{label}</span>
        <span className="text-sage">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-red"
      />
    </div>
  );
}

export default function Settings() {
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  const { theme, setTheme } = useTheme();
  const [customQuote, setCustomQuote] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearToday, setConfirmClearToday] = useState(false);
  const [resyncStatus, setResyncStatus] = useState("idle"); // idle | busy | done
  const notify = useNotify();
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  if (!settings) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const showIOSReminderNotice = isIOS && !isStandalone && !settings.iosReminderNoticeSeen;

  async function updateWeights(key, val) {
    await settingsRepo.update({ scoreWeights: { ...settings.scoreWeights, [key]: val } });
  }

  async function requestNotifPermission() {
    setNotifPermission(await notify.requestPermission());
  }

  async function handleExport() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `missy-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleClear() {
    await clearAllData();
    setConfirmClear(false);
  }

  async function handleClearToday() {
    await clearDataForDate(todayStr());
    setConfirmClearToday(false);
  }

  async function handleForceResync() {
    setResyncStatus("busy");
    await forceFullResync();
    setResyncStatus("done");
    setTimeout(() => setResyncStatus("idle"), 3000);
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader eyebrow="Configure" title="Settings" />

      <Section title="History">
        <p className="text-xs font-semibold text-sage">Look back at past days — tasks, scores, and daily stats.</p>
        <Link
          to="/history"
          className="flex h-11 w-full items-center justify-center rounded-2xl border border-sage/30 bg-base text-sm font-bold text-ink"
        >
          View history
        </Link>
      </Section>

      <Section title="Credentials vault">
        <p className="text-xs font-semibold text-sage">
          Store passwords behind a 4-digit code, with Face ID as an optional quick-unlock. Local-only — never synced.
        </p>
        <Link
          to="/vault"
          className="flex h-11 w-full items-center justify-center rounded-2xl border border-sage/30 bg-base text-sm font-bold text-ink"
        >
          Open vault
        </Link>
      </Section>

      <Section title="Appearance">
        <p className="text-xs font-semibold text-sage">Choose how Missy looks.</p>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-bold ${
                theme === key ? "border-transparent bg-charcoal text-white" : "border-sage/30 bg-base text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </Section>

      <CloudBackupSection resyncStatus={resyncStatus} onForceResync={handleForceResync} />

      <Section title="Task categories">
        <TagEditor label="Categories" tags={settings.tagList} onChange={(tags) => settingsRepo.update({ tagList: tags })} />
      </Section>

      <Section title="Recurring tasks">
        <p className="text-xs font-semibold text-sage">
          Manage tasks that repeat daily, on weekdays/weekends, or weekly. New ones are set from the task editor on
          Today.
        </p>
        <Link
          to="/recurring"
          className="flex h-11 w-full items-center justify-center rounded-2xl border border-sage/30 bg-base text-sm font-bold text-ink"
        >
          Manage recurring tasks
        </Link>
      </Section>

      <Section title="Carry-over">
        <p className="text-xs font-semibold text-sage">
          When a task isn't finished by day end, offer to carry it to tomorrow instead of letting it vanish.
        </p>
        <div className="flex gap-2">
          {[
            { value: true, label: "On" },
            { value: false, label: "Off" },
          ].map(({ value, label }) => {
            const isEnabled = settings.carryOverEnabled !== false;
            const isSelected = isEnabled === value;
            return (
              <button
                key={label}
                type="button"
                onClick={() => settingsRepo.update({ carryOverEnabled: value })}
                className={`flex-1 rounded-2xl border py-2.5 text-xs font-bold ${
                  isSelected ? "border-transparent bg-charcoal text-white" : "border-sage/30 bg-base text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Reminders">
        <p className="text-xs font-semibold text-sage">
          Reminders only fire while Missy is open in a tab, or installed and running on this device — they're a
          best-effort nudge, never a guaranteed background push.
        </p>

        {notify.supported && notifPermission !== "granted" && (
          <button
            type="button"
            onClick={requestNotifPermission}
            className="h-11 w-full rounded-2xl border border-sage/30 bg-base text-sm font-bold text-ink"
          >
            {notifPermission === "denied" ? "Notifications blocked — enable them in your browser settings" : "Enable notifications"}
          </button>
        )}

        {showIOSReminderNotice && (
          <div className="rounded-2xl bg-sage/20 p-3 text-xs font-semibold text-ink">
            <p>
              On iPhone/iPad, reminders only fire reliably once Missy is added to your home screen (Share → Add to
              Home Screen) — a browser tab alone won't get background notifications.
            </p>
            <button
              type="button"
              onClick={() => settingsRepo.update({ iosReminderNoticeSeen: true })}
              className="mt-2 text-xs font-bold text-ink underline"
            >
              Got it
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">
            Remind me by default for new timed tasks
          </label>
          <div className="flex gap-2">
            {[
              { value: true, label: "On" },
              { value: false, label: "Off" },
            ].map(({ value, label }) => {
              const isSelected = (settings.remindersEnabledByDefault !== false) === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => settingsRepo.update({ remindersEnabledByDefault: value })}
                  className={`flex-1 rounded-2xl border py-2.5 text-xs font-bold ${
                    isSelected ? "border-transparent bg-charcoal text-white" : "border-sage/30 bg-base text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            step="1"
            value={settings.reminderLeadMinutes}
            onChange={(e) => settingsRepo.update({ reminderLeadMinutes: Math.max(0, Number(e.target.value) || 0) })}
            className="h-11 w-20 rounded-2xl border border-sage/30 bg-base px-3 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
          <span className="text-xs font-bold text-sage">minutes before each timed task</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Morning nudge</p>
            <p className="text-xs font-semibold text-sage">Daily reminder to plan your day</p>
          </div>
          <button
            type="button"
            onClick={() => settingsRepo.update({ morningNudgeEnabled: !settings.morningNudgeEnabled })}
            className={`h-7 w-12 rounded-full transition-colors ${settings.morningNudgeEnabled ? "bg-red" : "bg-sage/30"}`}
          >
            <span
              className={`block h-6 w-6 rounded-full bg-white transition-transform ${
                settings.morningNudgeEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        {settings.morningNudgeEnabled && (
          <input
            type="time"
            value={settings.morningNudgeTime}
            onChange={(e) => settingsRepo.update({ morningNudgeTime: e.target.value })}
            className="h-11 w-full rounded-2xl border border-sage/30 bg-base px-3 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Evening nudge</p>
            <p className="text-xs font-semibold text-sage">Daily reminder to do your review</p>
          </div>
          <button
            type="button"
            onClick={() => settingsRepo.update({ eveningNudgeEnabled: !settings.eveningNudgeEnabled })}
            className={`h-7 w-12 rounded-full transition-colors ${settings.eveningNudgeEnabled ? "bg-red" : "bg-sage/30"}`}
          >
            <span
              className={`block h-6 w-6 rounded-full bg-white transition-transform ${
                settings.eveningNudgeEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        {settings.eveningNudgeEnabled && (
          <input
            type="time"
            value={settings.eveningNudgeTime}
            onChange={(e) => settingsRepo.update({ eveningNudgeTime: e.target.value })}
            className="h-11 w-full rounded-2xl border border-sage/30 bg-base px-3 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
        )}
      </Section>

      <Section title="Streaks">
        <p className="text-xs font-semibold text-sage">Score needed for a day to count toward your score streak.</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            max="100"
            step="5"
            value={settings.scoreStreakThreshold}
            onChange={(e) =>
              settingsRepo.update({ scoreStreakThreshold: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
            }
            className="h-11 w-24 rounded-2xl border border-sage/30 bg-base px-3 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
          <span className="text-xs font-bold text-sage">or higher</span>
        </div>
      </Section>

      <Section title="Score weighting">
        <p className="text-xs font-semibold text-sage">How your daily score is weighted. Normalized automatically.</p>
        <WeightSlider label="Task completion" value={settings.scoreWeights.taskCompletion} onChange={(v) => updateWeights("taskCompletion", v)} />
        <WeightSlider label="Ideas logged" value={settings.scoreWeights.ideasLogged} onChange={(v) => updateWeights("ideasLogged", v)} />
        <WeightSlider label="Words learned" value={settings.scoreWeights.wordsLearned} onChange={(v) => updateWeights("wordsLearned", v)} />
      </Section>

      <Section title="Screen time">
        <p className="text-xs font-semibold text-sage">
          Daily budget before Missy flags {"you're"} over, in the Wellness → Screen time tab.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="5"
            step="5"
            value={settings.screenTimeLimitMinutes}
            onChange={(e) => settingsRepo.update({ screenTimeLimitMinutes: Math.max(5, Number(e.target.value) || 0) })}
            className="h-11 w-24 rounded-2xl border border-sage/30 bg-base px-3 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
          <span className="text-xs font-bold text-sage">minutes / day</span>
        </div>
      </Section>

      <Section title="Motivational quotes">
        <p className="text-xs font-semibold text-sage">
          {settings.customQuotes.length} custom quote{settings.customQuotes.length === 1 ? "" : "s"} added, shown alongside Missy's built-ins.
        </p>
        <div className="space-y-2">
          {settings.customQuotes.map((q, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-2xl border border-sage/30 bg-base px-3 py-2">
              <span className="text-xs font-semibold text-ink">{q}</span>
              <button
                type="button"
                onClick={() =>
                  settingsRepo.update({ customQuotes: settings.customQuotes.filter((_, idx) => idx !== i) })
                }
              >
                <TrashIcon className="h-3.5 w-3.5 text-sage hover:text-red" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customQuote}
            onChange={(e) => setCustomQuote(e.target.value)}
            placeholder="Write your own line…"
            className="h-10 flex-1 rounded-2xl border border-sage/30 bg-base px-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!customQuote.trim()) return;
              settingsRepo.update({ customQuotes: [...settings.customQuotes, customQuote.trim()] });
              setCustomQuote("");
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-charcoal text-white"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </Section>

      <Section title="Your data">
        <button
          type="button"
          onClick={handleExport}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-sage/30 bg-base text-sm font-bold text-ink"
        >
          <DownloadIcon className="h-4 w-4" />
          Export as JSON
        </button>

        {!confirmClearToday ? (
          <button
            type="button"
            onClick={() => setConfirmClearToday(true)}
            className="h-12 w-full rounded-2xl border border-red/30 bg-surface text-sm font-bold text-red"
          >
            Clear today's data
          </button>
        ) : (
          <div className="space-y-2 rounded-2xl border border-red/30 bg-red/5 p-3">
            <p className="text-xs font-bold text-red">
              Deletes today's tasks, ideas, vocab, sleep, and screen-time log. Other days are untouched.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmClearToday(false)} className="h-10 flex-1 rounded-xl border border-sage/30 bg-surface text-xs font-bold text-ink">
                Cancel
              </button>
              <button type="button" onClick={handleClearToday} className="h-10 flex-1 rounded-xl bg-red text-xs font-bold text-white">
                Yes, clear today
              </button>
            </div>
          </div>
        )}

        {!confirmClear ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="h-12 w-full rounded-2xl border border-red/30 bg-surface text-sm font-bold text-red"
          >
            Clear all data
          </button>
        ) : (
          <div className="space-y-2 rounded-2xl border border-red/30 bg-red/5 p-3">
            <p className="text-xs font-bold text-red">
              This permanently deletes everything except your Private journal — that has its own separate delete,
              inside Private → Settings. Are you sure?
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmClear(false)} className="h-10 flex-1 rounded-xl border border-sage/30 bg-surface text-xs font-bold text-ink">
                Cancel
              </button>
              <button type="button" onClick={handleClear} className="h-10 flex-1 rounded-xl bg-red text-xs font-bold text-white">
                Yes, delete everything
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
