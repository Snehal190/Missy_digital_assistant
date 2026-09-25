import { useLiveQuery } from "dexie-react-hooks";
import ScoreRing from "../ui/ScoreRing";
import BentoMetric from "../ui/BentoMetric";
import HistoryTaskRow from "./HistoryTaskRow";
import { tasksRepo, scoresRepo, ideasRepo, vocabRepo, sleepRepo, screenTimeRepo } from "../../db/repository";
import { formatFriendly } from "../../lib/dates";
import { BulbIcon, BookIcon, MoonIcon, HourglassIcon } from "../icons";

// Renders one day's read-only detail — past or the still-in-progress "today"
// alike. Every field is a live query, so opening this on today's date just
// renders whatever's true right now (no score yet, tasks still changing)
// instead of assuming the day is finished. Never touches the private
// journal.
export default function DayDetail({ date }) {
  const tasks = useLiveQuery(() => tasksRepo.listByDate(date), [date]);
  const score = useLiveQuery(() => scoresRepo.get(date), [date]);
  const ideasCount = useLiveQuery(() => ideasRepo.countByDate(date), [date]);
  const wordsCount = useLiveQuery(() => vocabRepo.countByDate(date), [date]);
  const sleep = useLiveQuery(() => sleepRepo.get(date), [date]);
  const screenTime = useLiveQuery(() => screenTimeRepo.get(date), [date]);

  if (tasks === undefined || ideasCount === undefined || wordsCount === undefined || screenTime === undefined) {
    return <p className="px-5 text-sm font-semibold text-sage">Loading…</p>;
  }

  return (
    <div className="space-y-5 px-5 pb-6">
      <section className="rounded-card bg-surface p-5 text-center shadow-soft">
        <p className="text-xs font-bold uppercase tracking-widest text-sage">{formatFriendly(date)}</p>
        {score ? (
          <div className="mt-3">
            <ScoreRing score={score.score} />
          </div>
        ) : (
          <p className="mt-6 pb-2 text-sm font-semibold text-sage">No review recorded</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <BentoMetric label="Ideas logged" value={ideasCount} Icon={BulbIcon} />
        <BentoMetric label="Words learned" value={wordsCount} Icon={BookIcon} />
        <BentoMetric label="Sleep" value={sleep?.hours != null ? `${sleep.hours}h` : "—"} Icon={MoonIcon} />
        <BentoMetric label="Screen time" value={screenTime.minutes ? `${screenTime.minutes}m` : "—"} Icon={HourglassIcon} />
      </div>

      <section className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-sage">Tasks ({tasks.length})</p>
        {tasks.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-sage/40 p-6 text-center text-sm font-semibold text-sage">
            No tasks scheduled this day.
          </div>
        ) : (
          tasks.map((t) => <HistoryTaskRow key={t.id} task={t} />)
        )}
      </section>
    </div>
  );
}
