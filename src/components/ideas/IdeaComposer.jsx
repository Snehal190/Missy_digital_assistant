import { useState } from "react";
import { IDEA_TAGS } from "../../config/constants";
import { PlusIcon } from "../icons";
import { useDictation } from "../../hooks/useDictation";
import MicToggleButton from "../ui/MicToggleButton";

export default function IdeaComposer({ onAdd }) {
  const [text, setText] = useState("");
  const [tag, setTag] = useState("Idea");
  const dictation = useDictation({ value: text, onChange: setText });

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ text: text.trim(), tag });
    setText("");
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-card bg-surface p-4 shadow-soft">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Jot down whatever's on your mind…"
          className="w-full resize-none rounded-2xl border border-sage/30 bg-base px-3 py-2 pr-12 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
        />
        <MicToggleButton
          supported={dictation.supported}
          listening={dictation.listening}
          onClick={dictation.toggle}
          className="absolute right-2 top-2"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
          {IDEA_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTag(t)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                tag === t ? "border-charcoal bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Add idea"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red text-white shadow-red-glow disabled:opacity-40"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
