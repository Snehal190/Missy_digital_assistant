import Modal from "../ui/Modal";
import { retryItem, discardItem } from "../../db/syncQueue";
import { AlertIcon, TrashIcon } from "../icons";

const TABLE_LABELS = {
  tasks: "Task",
  ideas: "Idea",
  vocab: "Word",
  scores: "Score",
  sleep: "Sleep entry",
  screen_time: "Screen time",
  app_settings: "Settings",
};

export default function SyncStatusPanel({ items, onClose }) {
  const stalled = items.filter((i) => i.stalled);
  const pending = items.filter((i) => !i.stalled);

  return (
    <Modal title="Cloud backup" onClose={onClose}>
      <div className="space-y-4">
        {pending.length > 0 && (
          <p className="rounded-2xl bg-sage/10 p-3 text-xs font-semibold text-ink">
            {pending.length} change{pending.length === 1 ? "" : "s"} waiting to reach the cloud backup. This
            happens automatically in the background — no action needed.
          </p>
        )}

        {stalled.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-sage/30 p-6 text-center text-sm font-semibold text-sage">
            Nothing needs attention.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-sage">Needs attention</p>
            {stalled.map((item) => (
              <div key={item.id} className="space-y-2 rounded-[1.5rem] border border-red/20 bg-red/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">
                      {TABLE_LABELS[item.table] || item.table} · {item.operation === "delete" ? "delete" : "save"}
                    </p>
                    <p className="truncate text-xs font-semibold text-red">{item.lastError || "Repeated sync failures."}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => retryItem(item.id)}
                    className="h-9 flex-1 rounded-xl border border-sage/30 bg-surface text-xs font-bold text-ink"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => discardItem(item.id)}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red text-xs font-bold text-white"
                  >
                    <TrashIcon className="h-3.5 w-3.5" /> Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
