import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { MOOD_SCALE } from "../../config/constants";
import { journalRepo } from "../../db/journalRepository";
import { TrashIcon, EditIcon } from "../icons";

function moodLabel(value) {
  return MOOD_SCALE.find((m) => m.value === value)?.label;
}

function EntryRow({ entry, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveEdit() {
    if (!draft.trim()) return;
    await journalRepo.update(entry.id, { text: draft.trim() });
    setEditing(false);
    onChanged();
  }
  async function remove() {
    await journalRepo.remove(entry.id);
    onChanged();
  }

  return (
    <div className="rounded-[1.5rem] border border-sage/20 bg-surface p-4">
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="min-w-0">
          {entry.mood && (
            <span className="mr-2 rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
              {moodLabel(entry.mood)}
            </span>
          )}
          <span className="text-xs font-semibold text-sage">{format(parseISO(entry.createdAt), "h:mm a")}</span>
          {!expanded && <p className="mt-1 truncate text-sm font-medium text-ink">{entry.text}</p>}
        </span>
      </button>

      {expanded && !editing && (
        <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink">{entry.text}</p>
      )}

      {expanded && editing && (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          autoFocus
          className="mt-3 w-full resize-none rounded-2xl border border-sage/20 bg-base p-3 text-sm font-medium text-ink focus:border-sage/50 focus:outline-none"
        />
      )}

      {expanded && (
        <div className="mt-3 flex gap-2">
          {editing ? (
            <>
              <button type="button" onClick={() => setEditing(false)} className="h-9 flex-1 rounded-xl border border-sage/20 text-xs font-bold text-ink">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} className="h-9 flex-1 rounded-xl bg-charcoal text-xs font-bold text-white">
                Save
              </button>
            </>
          ) : confirmDelete ? (
            <>
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 flex-1 rounded-xl border border-sage/20 text-xs font-bold text-ink">
                Cancel
              </button>
              <button type="button" onClick={remove} className="h-9 flex-1 rounded-xl bg-red text-xs font-bold text-white">
                Delete entry
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sage/20 text-xs font-bold text-ink"
              >
                <EditIcon className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sage/20 text-xs font-bold text-red"
              >
                <TrashIcon className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function JournalEntryList({ entries, onChanged }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const day = format(parseISO(entry.createdAt), "EEEE, MMM d");
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(entry);
    }
    return [...map.entries()];
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-sage/30 p-8 text-center text-sm font-medium text-sage">
        Nothing written yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([day, dayEntries]) => (
        <div key={day} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-sage">{day}</p>
          {dayEntries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onChanged={onChanged} />
          ))}
        </div>
      ))}
    </div>
  );
}
