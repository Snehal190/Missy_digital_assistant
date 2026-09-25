import { useMemo, useState } from "react";
import { computeSleepHours } from "../../lib/sleep";

const QUALITY_LABELS = ["Rough", "Okay", "Good", "Great", "Amazing"];

export default function SleepComposer({ existing, onSave }) {
  const [bedtime, setBedtime] = useState(existing?.bedtime || "23:00");
  const [wakeTime, setWakeTime] = useState(existing?.wakeTime || "07:00");
  const [quality, setQuality] = useState(existing?.quality || 3);

  const hours = useMemo(() => computeSleepHours(bedtime, wakeTime), [bedtime, wakeTime]);

  function submit(e) {
    e.preventDefault();
    onSave({ bedtime, wakeTime, quality });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-card bg-surface p-4 shadow-soft">
      <p className="text-[10px] font-bold uppercase tracking-wide text-sage">Last night</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Bedtime</label>
          <input
            type="time"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
            className="h-11 w-full rounded-2xl border border-sage/30 bg-base px-3 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">Wake time</label>
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="h-11 w-full rounded-2xl border border-sage/30 bg-base px-3 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-sage/20 px-4 py-3">
        <span className="text-xs font-bold text-ink">Hours slept</span>
        <span className="text-lg font-black text-ink">{hours ?? "—"}</span>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-sage">How did it feel?</label>
        <div className="flex gap-1.5">
          {QUALITY_LABELS.map((label, i) => {
            const value = i + 1;
            return (
              <button
                type="button"
                key={label}
                onClick={() => setQuality(value)}
                className={`flex-1 rounded-xl border py-2 text-[10px] font-bold ${
                  quality === value ? "border-red bg-red text-white" : "border-sage/30 bg-base text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <button type="submit" className="h-12 w-full rounded-2xl bg-red text-sm font-bold text-white shadow-red-glow">
        Save
      </button>
    </form>
  );
}
