import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getInsightsData, settingsRepo } from "../../db/repository";
import {
  sleepScoreComparison,
  screenTimeScoreComparison,
  categoryCompletionRates,
  bestWorstDayOfWeek,
} from "../../lib/insights";
import { explainPatterns, InsightsExplainError } from "../../lib/api";
import { SparkleIcon } from "../icons";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Card({ title, children }) {
  return (
    <div className="rounded-card border border-sage/30 bg-surface p-4 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wide text-sage">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function NeedMore({ n }) {
  return <p className="text-sm font-semibold text-sage">Keep logging — need {n} more day{n === 1 ? "" : "s"} of data here.</p>;
}

function ComparisonRow({ leftLabel, leftValue, rightLabel, rightValue }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-2xl font-black text-ink">{leftValue}</p>
        <p className="text-[11px] font-semibold text-sage">{leftLabel}</p>
      </div>
      <div>
        <p className="text-2xl font-black text-ink">{rightValue}</p>
        <p className="text-[11px] font-semibold text-sage">{rightLabel}</p>
      </div>
    </div>
  );
}

export default function InsightsPanel() {
  const data = useLiveQuery(() => getInsightsData(30), []);
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sleepCmp = useMemo(() => (data ? sleepScoreComparison(data) : null), [data]);
  const screenCmp = useMemo(() => (data ? screenTimeScoreComparison(data) : null), [data]);
  const categories = useMemo(() => (data ? categoryCompletionRates(data.tasks) : []), [data]);
  const weekday = useMemo(() => (data ? bestWorstDayOfWeek(data.scores) : null), [data]);

  const cache = settings?.insightsCache;
  // Reads the wall clock, so it belongs in an effect, not render.
  const [cacheFreshness, setCacheFreshness] = useState({ valid: false, hoursUntilFresh: 0 });
  useEffect(() => {
    if (!cache) {
      setCacheFreshness({ valid: false, hoursUntilFresh: 0 });
      return;
    }
    const ageMs = Date.now() - new Date(cache.generatedAt).getTime();
    const valid = ageMs < CACHE_TTL_MS;
    setCacheFreshness({ valid, hoursUntilFresh: valid ? Math.ceil((CACHE_TTL_MS - ageMs) / (60 * 60 * 1000)) : 0 });
  }, [cache]);
  const { valid: cacheValid, hoursUntilFresh } = cacheFreshness;

  async function explain() {
    if (!data) return;
    setLoading(true);
    setError("");
    try {
      const sleepByDate = new Map(data.sleep.map((s) => [s.date, s.hours]));
      const screenByDate = new Map(data.screenTime.map((s) => [s.date, s.minutes]));
      const dailyRecords = data.scores.map((s) => ({
        date: s.date,
        score: s.score,
        sleepHours: sleepByDate.get(s.date) ?? null,
        screenMinutes: screenByDate.get(s.date) ?? null,
        tasksCompleted: s.tasksCompleted,
        tasksPlanned: s.tasksPlanned,
      }));
      const result = await explainPatterns(dailyRecords, categories);
      await settingsRepo.update({ insightsCache: { generatedAt: new Date().toISOString(), ...result } });
    } catch (err) {
      setError(err instanceof InsightsExplainError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!data) return null;

  return (
    <div className="space-y-3 px-5">
      <Card title="Sleep vs score">
        {sleepCmp.ready ? (
          <ComparisonRow
            leftLabel={`7+ hrs sleep (${sleepCmp.aboveCount}d)`}
            leftValue={sleepCmp.aboveAvg}
            rightLabel={`Under 7 hrs (${sleepCmp.belowCount}d)`}
            rightValue={sleepCmp.belowAvg}
          />
        ) : (
          <NeedMore n={sleepCmp.needMore} />
        )}
      </Card>

      <Card title="Screen time vs score">
        {screenCmp.ready ? (
          <ComparisonRow
            leftLabel={`Under budget (${screenCmp.underCount}d)`}
            leftValue={screenCmp.underAvg}
            rightLabel={`Over budget (${screenCmp.overCount}d)`}
            rightValue={screenCmp.overAvg}
          />
        ) : (
          <NeedMore n={screenCmp.needMore} />
        )}
      </Card>

      <Card title="Best & worst day of the week">
        {weekday.ready ? (
          <ComparisonRow
            leftLabel={`Best: ${capitalize(weekday.best.day)}`}
            leftValue={weekday.best.avg}
            rightLabel={`Hardest: ${capitalize(weekday.worst.day)}`}
            rightValue={weekday.worst.avg}
          />
        ) : (
          <NeedMore n={weekday.needMore} />
        )}
      </Card>

      <Card title="Task completion by category (30d)">
        {categories.length === 0 ? (
          <p className="text-sm font-semibold text-sage">No tasks logged in the last 30 days yet.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.category} className="flex items-center justify-between text-sm font-semibold text-ink">
                <span>{c.category}</span>
                <span className="text-sage">
                  {c.completed}/{c.planned} {c.rate !== null && `· ${c.rate}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="px-1 text-[11px] font-semibold text-sage">
        These are observed patterns in your own data, not proven cause-and-effect.
      </p>

      <Card title="Explain my patterns">
        {!cache && !loading && (
          <p className="mb-2 text-xs font-semibold text-sage">
            Sends only your last 30 days of scores/sleep/screen-time/task-count numbers to Gemini — never task
            titles, ideas, or vocab content.
          </p>
        )}
        {cache && (
          <div className="mb-3 space-y-2">
            <ul className="list-disc space-y-1 pl-4 text-sm font-semibold text-ink">
              {cache.observations.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
            <p className="rounded-2xl bg-sage/20 p-3 text-sm font-bold text-ink">Try this: {cache.experiment}</p>
          </div>
        )}
        {error && <p className="mb-2 text-xs font-semibold text-red">{error}</p>}
        <button
          type="button"
          onClick={explain}
          disabled={loading || cacheValid}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-50"
        >
          <SparkleIcon className="h-4 w-4" />
          {loading
            ? "Thinking…"
            : cacheValid
              ? `Refresh available in ${hoursUntilFresh}h`
              : cache
                ? "Regenerate"
                : "Explain my patterns"}
        </button>
      </Card>
    </div>
  );
}
