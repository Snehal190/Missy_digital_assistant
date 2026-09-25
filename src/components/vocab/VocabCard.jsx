import { TrashIcon } from "../icons";
import { MASTERED_INTERVAL_DAYS } from "../../lib/srs";

export default function VocabCard({ item, onRemove }) {
  const mastered = (item.interval || 0) > MASTERED_INTERVAL_DAYS;

  return (
    <div className="rounded-[1.5rem] border border-sage/30 bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-lg font-black text-ink">{item.word}</p>
          {(item.partOfSpeech || item.pronunciation) && (
            <p className="text-[11px] font-semibold text-sage">
              {[item.partOfSpeech, item.pronunciation].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mastered && (
            <span className="rounded-full bg-sage/25 px-2 py-0.5 text-[10px] font-bold text-ink">Mastered</span>
          )}
          <button type="button" onClick={() => onRemove(item)} aria-label="Delete" className="text-sage hover:text-red">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      {item.meaning && <p className="mt-1 text-sm font-semibold text-ink">{item.meaning}</p>}
      {item.example && <p className="mt-1 text-sm italic text-sage">"{item.example}"</p>}
    </div>
  );
}
