import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { supabase } from "../../db/supabaseClient";
import { useAuthSession } from "../../hooks/useAuthSession";
import SyncStatusPanel from "./SyncStatusPanel";
import { SyncIcon, AlertIcon, CheckIcon, CloudOffIcon } from "../icons";

export default function SyncStatusIndicator() {
  const [open, setOpen] = useState(false);
  const { user, ready } = useAuthSession();
  const items = useLiveQuery(() => db.syncQueue.toArray(), []) || [];

  if (!supabase || !ready) return null; // no cloud configured, or still checking session

  if (!user) {
    return (
      <span
        className="flex h-8 items-center gap-1.5 rounded-full border border-sage/20 bg-surface px-3 text-[11px] font-bold text-sage"
        title="Sign in from Settings to enable cloud backup"
      >
        <CloudOffIcon className="h-3.5 w-3.5" />
        Backup paused
      </span>
    );
  }

  const stalledCount = items.filter((i) => i.stalled).length;
  const pendingCount = items.length;

  let Icon = CheckIcon;
  let label = "Synced";
  let tone = "text-sage";
  if (stalledCount > 0) {
    Icon = AlertIcon;
    label = "Attention";
    tone = "text-red";
  } else if (pendingCount > 0) {
    Icon = SyncIcon;
    label = `${pendingCount} pending`;
    tone = "text-ink";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Cloud backup status: ${label}`}
        className="flex h-8 items-center gap-1.5 rounded-full border border-sage/20 bg-surface px-3 text-[11px] font-bold"
      >
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        <span className={tone}>{label}</span>
      </button>
      {open && <SyncStatusPanel items={items} onClose={() => setOpen(false)} />}
    </>
  );
}
