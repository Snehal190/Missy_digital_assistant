import { useState } from "react";
import Modal from "../ui/Modal";
import { vocabRepo } from "../../db/repository";
import { FlipIcon } from "../icons";

const RATINGS = [
  { value: "again", label: "Again", className: "border-red/40 bg-red/10 text-red" },
  { value: "hard", label: "Hard", className: "border-sage/30 bg-surface text-ink" },
  { value: "good", label: "Good", className: "border-sage/30 bg-surface text-ink" },
  { value: "easy", label: "Easy", className: "border-sage/40 bg-sage/20 text-ink" },
];

export default function FlashcardReview({ words, onClose }) {
  // Frozen at open time so rating a word (which reschedules it out of
  // today's due list) doesn't shift the queue out from under the reviewer.
  const [queue] = useState(words);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const word = queue[index];

  async function rate(rating) {
    await vocabRepo.rate(word.id, rating);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (!word) {
    return (
      <Modal title="Review" onClose={onClose}>
        <div className="py-10 text-center">
          <p className="text-3xl">🎉</p>
          <p className="mt-2 text-sm font-bold text-ink">All done for today — nice work.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Review · ${index + 1}/${queue.length}`} onClose={onClose}>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="grid min-h-[220px] w-full place-items-center rounded-card border border-sage/30 bg-surface p-6 text-center shadow-soft"
      >
        {!revealed ? (
          <span className="text-3xl font-black text-ink">{word.word}</span>
        ) : (
          <div className="space-y-2">
            <span className="text-xl font-black text-ink">{word.word}</span>
            {(word.partOfSpeech || word.pronunciation) && (
              <p className="text-xs font-semibold text-sage">
                {[word.partOfSpeech, word.pronunciation].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="text-sm font-semibold text-ink">{word.meaning || "No definition saved yet."}</p>
            {word.example && <p className="text-sm italic text-sage">"{word.example}"</p>}
          </div>
        )}
      </button>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-sage/30 bg-surface text-sm font-bold text-ink"
        >
          <FlipIcon className="h-4 w-4" />
          Reveal
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => rate(r.value)}
              className={`rounded-2xl border py-3 text-xs font-bold ${r.className}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
