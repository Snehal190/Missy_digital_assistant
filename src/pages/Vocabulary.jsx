import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import PageHeader from "../components/layout/PageHeader";
import VocabComposer from "../components/vocab/VocabComposer";
import VocabCard from "../components/vocab/VocabCard";
import FlashcardReview from "../components/vocab/FlashcardReview";
import BentoMetric from "../components/ui/BentoMetric";
import { vocabRepo, getStreaks } from "../db/repository";
import { autofillVocab, VocabAutofillError } from "../lib/api";
import { formatFriendly } from "../lib/dates";
import { MASTERED_INTERVAL_DAYS } from "../lib/srs";
import { BookIcon, SparkleIcon } from "../components/icons";

export default function Vocabulary() {
  const words = useLiveQuery(() => vocabRepo.list(), []) || [];
  const dueWords = useLiveQuery(() => vocabRepo.listDueToday(), []) || [];
  const streaks = useLiveQuery(() => getStreaks(), []);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [batchAutofilling, setBatchAutofilling] = useState(false);
  const [batchAutofillError, setBatchAutofillError] = useState("");

  const mastered = useMemo(() => words.filter((w) => (w.interval || 0) > MASTERED_INTERVAL_DAYS).length, [words]);
  const missingMeaning = useMemo(() => words.filter((w) => !w.meaning?.trim()), [words]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const w of words) {
      if (!groups.has(w.dateLearned)) groups.set(w.dateLearned, []);
      groups.get(w.dateLearned).push(w);
    }
    return [...groups.entries()];
  }, [words]);

  async function batchAutofill() {
    if (missingMeaning.length === 0) return;
    setBatchAutofilling(true);
    setBatchAutofillError("");
    try {
      const results = await autofillVocab(missingMeaning.map((w) => w.word));
      await Promise.all(
        missingMeaning.map((w, i) => {
          const r = results[i];
          if (!r) return null;
          return vocabRepo.update(w.id, {
            meaning: r.meaning || "",
            example: r.example || "",
            partOfSpeech: r.partOfSpeech || "",
            pronunciation: r.pronunciation || "",
          });
        }),
      );
    } catch (err) {
      setBatchAutofillError(err instanceof VocabAutofillError ? err.message : "Couldn't auto-fill. Try again.");
    } finally {
      setBatchAutofilling(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Word bank" title="Vocabulary" badgeCount={dueWords.length} />

      <div className="px-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {streaks && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red/10 px-3 py-1.5 text-xs font-bold text-red">
              🔥 {streaks.vocab.count > 0 ? `${streaks.vocab.count}-day streak` : "Start a streak today"}
              {streaks.vocab.recovering ? " · recovering" : ""}
            </span>
          )}
          {dueWords.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/20 px-3 py-1.5 text-xs font-bold text-ink">
              {dueWords.length} due today
            </span>
          )}
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <BentoMetric label="Total words" value={words.length} Icon={BookIcon} />
          <BentoMetric label="Mastered" value={mastered} Icon={SparkleIcon} />
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            disabled={dueWords.length === 0}
            className="rounded-2xl bg-charcoal p-3 text-left text-white disabled:opacity-40"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-sage">Practice</p>
            <p className="mt-1 text-sm font-bold">Review ({dueWords.length})</p>
          </button>
        </div>

        <VocabComposer onAdd={(w) => vocabRepo.create(w)} />

        {missingMeaning.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={batchAutofill}
              disabled={batchAutofilling}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-sage/30 bg-surface text-xs font-bold text-ink disabled:opacity-60"
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              {batchAutofilling
                ? "Auto-filling…"
                : `Auto-fill ${missingMeaning.length} word${missingMeaning.length === 1 ? "" : "s"} missing a meaning`}
            </button>
            {batchAutofillError && <p className="mt-1 text-xs font-semibold text-red">{batchAutofillError}</p>}
          </div>
        )}
      </div>

      <div className="space-y-4 px-5">
        {grouped.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-sage/40 p-6 text-center text-sm font-semibold text-sage">
            No words logged yet.
          </div>
        )}
        {grouped.map(([date, items]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-sage">{formatFriendly(date)}</p>
            {items.map((item) => (
              <VocabCard key={item.id} item={item} onRemove={(w) => vocabRepo.remove(w.id)} />
            ))}
          </div>
        ))}
      </div>

      {reviewOpen && <FlashcardReview words={dueWords} onClose={() => setReviewOpen(false)} />}
    </div>
  );
}
