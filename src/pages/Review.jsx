import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import PageHeader from "../components/layout/PageHeader";
import ScoreTrendChart from "../components/review/ScoreTrendChart";
import BentoMetric from "../components/ui/BentoMetric";
import StreakChip from "../components/ui/StreakChip";
import InsightsPanel from "../components/review/InsightsPanel";
import WeeklyReviewPanel from "../components/review/WeeklyReviewPanel";
import { scoresRepo, getStreaks } from "../db/repository";
import { formatFriendly } from "../lib/dates";
import { CheckIcon, BulbIcon, BookIcon } from "../components/icons";

export default function Review() {
  const scores = useLiveQuery(() => scoresRepo.list(), []) || [];
  const streaks = useLiveQuery(() => getStreaks(), []);
  const [tab, setTab] = useState("history"); // "history" | "insights"
  const recent = [...scores].reverse();
  const avg = scores.length ? Math.round(scores.reduce((s, d) => s + d.score, 0) / scores.length) : 0;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Your history" title="Review" />

      {streaks && (
        <div className="grid grid-cols-3 gap-2 px-5">
          <StreakChip emoji="🔥" label="Review" count={streaks.review.count} recovering={streaks.review.recovering} />
          <StreakChip emoji="⭐" label="Score" count={streaks.score.count} recovering={streaks.score.recovering} />
          <StreakChip emoji="📚" label="Vocab" count={streaks.vocab.count} recovering={streaks.vocab.recovering} />
        </div>
      )}

      <div className="flex gap-2 px-5">
        {[
          { key: "history", label: "History" },
          { key: "weekly", label: "Weekly" },
          { key: "insights", label: "Insights" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-2xl border py-2.5 text-xs font-bold ${
              tab === t.key ? "border-transparent bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "weekly" &&
        (scores.length === 0 ? (
          <div className="mx-5 rounded-card border border-dashed border-sage/40 bg-surface p-8 text-center text-sm font-semibold text-sage">
            End your first day to unlock your weekly review.
          </div>
        ) : (
          <WeeklyReviewPanel />
        ))}
      {tab === "insights" &&
        (scores.length === 0 ? (
          <div className="mx-5 rounded-card border border-dashed border-sage/40 bg-surface p-8 text-center text-sm font-semibold text-sage">
            End your first day to unlock insights.
          </div>
        ) : (
          <InsightsPanel />
        ))}

      {tab === "history" && (
        <>
          <div className="px-5">
            {scores.length === 0 ? (
              <div className="rounded-card border border-dashed border-sage/40 bg-surface p-8 text-center text-sm font-semibold text-sage">
                End your first day to start building a history.
              </div>
            ) : (
              <>
                <ScoreTrendChart scores={scores} />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <BentoMetric label="Average score" value={avg} Icon={CheckIcon} />
                  <BentoMetric label="Days tracked" value={scores.length} Icon={BookIcon} />
                </div>
              </>
            )}
          </div>

          {recent.length > 0 && (
            <div className="space-y-2 px-5">
              <p className="text-xs font-bold uppercase tracking-wide text-sage">Past days</p>
              {recent.map((day) => (
                <div key={day.date} className="flex items-center gap-3 rounded-[1.5rem] border border-sage/30 bg-surface p-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red/10 text-sm font-black text-red">
                    {day.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{formatFriendly(day.date)}</p>
                    <p className="flex items-center gap-2 text-xs font-semibold text-sage">
                      <CheckIcon className="h-3 w-3" /> {day.tasksCompleted}/{day.tasksPlanned}
                      <BulbIcon className="h-3 w-3" /> {day.ideasLogged}
                      <BookIcon className="h-3 w-3" /> {day.wordsLearned}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
