import { KeyIcon } from "../icons";

export default function CredentialCard({ entry, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.id)}
      className="flex w-full items-center gap-3 rounded-[1.5rem] border border-sage/30 bg-surface p-3 text-left"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-charcoal/10">
        <KeyIcon className="h-5 w-5 text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{entry.label}</p>
        <p className="text-xs font-semibold text-sage">Tap to view</p>
      </div>
    </button>
  );
}
