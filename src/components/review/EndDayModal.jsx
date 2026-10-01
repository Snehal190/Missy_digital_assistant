import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Modal from "../ui/Modal";
import ScoreRing from "../ui/ScoreRing";
import BentoMetric from "../ui/BentoMetric";
import {
  tasksRepo,
  ideasRepo,
  vocabRepo,
  scoresRepo,
  settingsRepo,
  advanceActiveDay,
  materializeRecurringTasksIfNeeded,
} from "../../db/repository";
import { computeDailyScore } from "../../lib/scoring";
import { getQuoteOfTheDay } from "../../lib/dailyQuote";
import { localDateFromISO } from "../../lib/dates";
import { emojiFor } from "../../lib/categoryIcons";
import { CheckIcon, BulbIcon, BookIcon } from "../icons";

const CARRY_ACTIONS = [
  { value: "carry", label: "Carry to tomorrow" },
  { value: "skip", label: "Mark skipped" },
  { value: "delete", label: "Delete" },
];

export default function EndDayModal({ date: dateProp, onClose }) {
  // Frozen on open — the active day advances (below) as soon as the score
  // is tallied, which would otherwise change this prop out from under the
  // modal while it's still showing the carry-over step.
  const [date] = useState(dateProp);
  const [result, setResult] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [choices, setChoices] = useState({});
  const [step, setStep] = useState("score"); // "score" | "carryover"
  const [applying, setApplying] = useState(false);
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  const quote = getQuoteOfTheDay(date, settings?.customQuotes || []);

  useEffect(() => {
    if (!settings) return;
    (async () => {
      const [tasks, ideas, words] = await Promise.all([
        tasksRepo.listByDate(date),
        ideasRepo.list(),
        vocabRepo.countByDate(date),
      ]);
      const ideasToday = ideas.filter((i) => localDateFromISO(i.timestamp) === date).length;
      const scoreData = computeDailyScore({
        tasks,
        ideasCount: ideasToday,
        wordsCount: words,
        weights: settings.scoreWeights,
        caps: settings.scoreCaps,
      });
      await scoresRepo.upsert(date, scoreData);
      // The only place the active day is allowed to move forward — tapping
      // "End my day" and having it tally a score IS what ends the day.
      // Re-materializing right after means tomorrow's recurring tasks show
      // up immediately instead of waiting for a fresh app launch.
      await advanceActiveDay(date);
      await materializeRecurringTasksIfNeeded();
      setResult(scoreData);

      const unfinished = tasks.filter((t) => t.status === "Not started" || t.status === "In progress");
      setPendingTasks(unfinished);
      setChoices(Object.fromEntries(unfinished.map((t) => [t.id, "carry"])));
    })();
  }, [date, settings]);

  const carryOverEnabled = settings?.carryOverEnabled !== false;
  const hasCarryOverStep = carryOverEnabled && pendingTasks.length > 0;

  async function confirmCarryOver() {
    setApplying(true);
    for (const task of pendingTasks) {
      const choice = choices[task.id];
      if (choice === "carry") await tasksRepo.carryToTomorrow(task);
      else if (choice === "skip") await tasksRepo.update(task.id, { status: "Skipped" });
      else if (choice === "delete") await tasksRepo.remove(task.id);
    }
    setApplying(false);
    onClose();
  }

  return (
    <Modal title="Day review" onClose={onClose}>
      {!result ? (
        <div className="py-10 text-center text-sm font-semibold text-sage">Tallying up your day…</div>
      ) : step === "score" ? (
        <div className="space-y-5">
          <ScoreRing score={result.score} />
          <p className="rounded-2xl bg-sage/20 p-4 text-center text-sm font-bold italic text-ink">“{quote}”</p>

          <div className="grid grid-cols-3 gap-2">
            <BentoMetric label="Tasks" value={`${result.tasksCompleted}/${result.tasksPlanned}`} Icon={CheckIcon} />
            <BentoMetric label="Ideas" value={result.ideasLogged} Icon={BulbIcon} />
            <BentoMetric label="Words" value={result.wordsLearned} Icon={BookIcon} />
          </div>

          <button
            type="button"
            onClick={() => (hasCarryOverStep ? setStep("carryover") : onClose())}
            className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white"
          >
            {hasCarryOverStep ? "Review unfinished tasks" : "Done for today"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-sage">
            {pendingTasks.length} task{pendingTasks.length === 1 ? "" : "s"} didn't get finished. Carrying is picked
            by default — change any you'd rather skip or drop.
          </p>

          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {pendingTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-sage/30 bg-base p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-charcoal/10 text-lg">
                    {emojiFor(task.category)}
                  </span>
                  <span className="min-w-0 truncate text-sm font-bold text-ink">{task.title}</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {CARRY_ACTIONS.map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setChoices((c) => ({ ...c, [task.id]: action.value }))}
                      className={`flex-1 rounded-full border px-2 py-1.5 text-[11px] font-bold ${
                        choices[task.id] === action.value
                          ? "border-charcoal bg-charcoal text-white"
                          : "border-sage/30 bg-surface text-ink"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={confirmCarryOver}
            disabled={applying}
            className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-50"
          >
            {applying ? "Wrapping up…" : "Confirm and finish"}
          </button>
        </div>
      )}
    </Modal>
  );
}
