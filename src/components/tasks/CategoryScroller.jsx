import { emojiFor } from "../../lib/categoryIcons";

export default function CategoryScroller({ tags, selected, onSelect, counts }) {
  const options = ["All", ...tags];
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-1">
      {options.map((tag) => {
        const active = selected === tag;
        const count = counts?.[tag];
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(tag)}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl border transition-all ${
              active
                ? "h-14 w-40 justify-start border-transparent bg-charcoal px-2 text-white"
                : "h-14 w-14 justify-center border-sage/30 bg-surface text-ink"
            }`}
          >
            {active ? (
              <>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red text-xs font-black text-white">
                  {count ?? 0}
                </span>
                <span className="truncate text-sm font-bold">{tag}</span>
              </>
            ) : (
              <span className="text-2xl leading-none">{emojiFor(tag)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
