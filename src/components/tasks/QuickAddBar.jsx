import { useState } from "react";
import { parseQuickAdd } from "../../lib/quickAdd";
import { PlusIcon } from "../icons";

export default function QuickAddBar({ onAdd, onOpenFull }) {
  const [value, setValue] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    const { title, time } = parseQuickAdd(value);
    onAdd({ title, time });
    setValue("");
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Quick add… e.g. Gym 7am"
        className="h-12 flex-1 rounded-2xl border border-sage/30 bg-surface px-4 text-sm font-semibold text-ink placeholder:text-sage focus:border-ink focus:outline-none"
      />
      <button
        type="button"
        onClick={onOpenFull}
        className="h-12 shrink-0 rounded-2xl border border-sage/30 bg-surface px-3 text-xs font-bold text-ink"
      >
        Details
      </button>
      <button
        type="submit"
        aria-label="Add task"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-charcoal text-white"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </form>
  );
}
