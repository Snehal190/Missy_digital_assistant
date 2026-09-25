import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getWeeklyReviewData, weeklyReviewsRepo } from "../../db/repository";
import { weekStartFor, describeWeekRange, isWeekReviewable, previousWeekStart, nextWeekStart } from "../../lib/weeklyReview";
import { explainWeek, WeeklyReviewError } from "../../lib/api";
import { formatFriendly, todayStr } from "../../lib/dates";
import { SparkleIcon, ChevronLeftIcon } from "../icons";

function latestReviewableWeek() {
  const thisWeek = weekStartFor(todayStr());
  return isWeekReviewable(thisWeek) ? thisWeek : previousWeekStart(thisWeek);
}

function Card({ title, children }) {
  return (
    <div className="rounded-card border border-sage/30 bg-surface p-4 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wide text-sage">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function WeeklyReviewPanel() {
  const [weekStart, setWeekStart] = useState(latestReviewableWeek);
  const data = useLiveQuery(() => getWeeklyReviewData(weekStart), [weekStart]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const latest = latestReviewableWeek();
  const canGoNext = weekStart < latest;

  async function generate() {
    if (!data) return;
    setLoading(true);
    setError("");
    try {
      const stats = {
        weekStart: data.weekStart,
        avgScore: data.avgScore,
        tasksCompleted: data.tasksCompleted,
        tasksPlanned: data.tasksPlanned,
        categoryBreakdown: data.categoryBreakdown,
        ideasCount: data.ideasCount,
        wordsCount: data.wordsCount,
        ideaToTaskCount: data.ideaToTaskCount,
        avgSleepHours: data.avgSleepHours,
        totalScreenMinutes: data.totalScreenMinutes,
        screenBudgetMinutes: data.screenBudgetMinutes,
      };
      const result = await explainWeek(stats, data.ideaTitles);
      await weeklyReviewsRepo.saveAi(weekStart, result);
    } catch (err) {
      setError(err instanceof WeeklyReviewError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!data) return null;

  const hasData = data.scores.length > 0;

  return (
    <div className="space-y-3 px-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekStart(previousWeekStart(weekStart))}
          aria-label="Previous week"
          className="grid h-9 w-9 place-items-center rounded-full border border-sage/30 bg-surface"
        >
          <ChevronLeftIcon className="h-4 w-4 text-ink" />
        </button>
        <p className="text-sm font-bold text-ink">{describeWeekRange(weekStart)}</p>
        <button
          type="button"
          onClick={() => canGoNext && setWeekStart(nextWeekStart(weekStart))}
          disabled={!canGoNext}
          aria-label="Next week"
          className="grid h-9 w-9 place-items-center rounded-full border border-sage/30 bg-surface disabled:opacity-30"
        >
          <ChevronLeftIcon className="h-4 w-4 rotate-180 text-ink" />
        </button>
      </div>

      {!hasData ? (
        <div className="rounded-card border border-dashed border-sage/40 bg-surface p-6 text-center text-sm font-semibold text-sage">
          No days reviewed this week yet.
        </div>
      ) : (
        <>
          <Card title="Score trend">
            <div className="flex items-end justify-between gap-1">
              {data.scores.map((s) => (
                <div key={s.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-bold text-ink">{s.score}</span>
                  <div className="h-16 w-full rounded-full bg-sage/20">
                    <div
                      className="w-full rounded-full bg-red"
                      style={{ height: `${Math.max(4, s.score)}%`, marginTop: `${100 - Math.max(4, s.score)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-sage">{formatFriendly(s.date).slice(0, 3)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-bold text-ink">Weekly average: {data.avgScore}</p>
          </Card>

          {data.bestDay && data.worstDay && data.bestDay.date !== data.worstDay.date && (
            <Card title="Best & hardest day">
              <p className="text-sm font-semibold text-ink">
                Your best day was {formatFriendly(data.bestDay.date)}, scoring {data.bestDay.score}. Your hardest was{" "}
                {formatFriendly(data.worstDay.date)}, at {data.worstDay.score}.
              </p>
            </Card>
          )}

          <Card title="Tasks">
            <p className="text-2xl font-black text-ink">
              {data.tasksCompleted}/{data.tasksPlanned}
            </p>
            {data.categoryBreakdown.length > 0 && (
              <div className="mt-2 space-y-1">
                {data.categoryBreakdown.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm font-semibold text-ink">
                    <span>{c.category}</span>
                    <span className="text-sage">{c.completed} completed</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Card title="Ideas & words">
              <p className="text-sm font-semibold text-ink">{data.ideasCount} ideas captured</p>
              <p className="text-sm font-semibold text-ink">{data.wordsCount} words learned</p>
              <p className="text-sm font-semibold text-ink">{data.ideaToTaskCount} idea → task</p>
            </Card>
            <Card title="Sleep & screen">
              <p className="text-sm font-semibold text-ink">{data.avgSleepHours ?? "—"} hrs avg sleep</p>
              <p className="text-sm font-semibold text-ink">
                {data.totalScreenMinutes}/{data.screenBudgetMinutes} min screen
              </p>
            </Card>
          </div>

          <Card title="AI weekly recap">
            {!data.cachedAi && !loading && (
              <p className="mb-2 text-xs font-semibold text-sage">
                Sends this week's aggregated stats plus idea titles (first line only) to Gemini — never full idea
                text, task titles, or the private journal.
              </p>
            )}
            {data.cachedAi && (
              <div className="mb-3 space-y-2">
                <ul className="list-disc space-y-1 pl-4 text-sm font-semibold text-ink">
                  {data.cachedAi.observations.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
                <p className="rounded-2xl bg-sage/20 p-3 text-sm font-bold text-ink">
                  What went well: {data.cachedAi.wentWell}
                </p>
                <p className="rounded-2xl bg-sage/20 p-3 text-sm font-bold text-ink">
                  Focus for next week: {data.cachedAi.focusSuggestion}
                </p>
              </div>
            )}
            {error && <p className="mb-2 text-xs font-semibold text-red">{error}</p>}
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-50"
            >
              <SparkleIcon className="h-4 w-4" />
              {loading ? "Thinking…" : data.cachedAi ? "Regenerate" : "Generate weekly review"}
            </button>
          </Card>
        </>
      )}
    </div>
  );
}
