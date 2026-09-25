import { useEffect, useRef } from "react";
import { screenTimeRepo } from "../../db/repository";
import { useNotify } from "../../hooks/useNotify";
import { SCREEN_TIME_APP } from "../../config/constants";
import { BellIcon } from "../icons";

const QUICK_ADDS = [5, 15, 30];

export default function ScreenTimeTracker({ today, limitMinutes, date }) {
  const { supported, notify, requestPermission } = useNotify();
  const prevMinutes = useRef(today.minutes);

  useEffect(() => {
    const crossedNow = prevMinutes.current <= limitMinutes && today.minutes > limitMinutes;
    prevMinutes.current = today.minutes;
    if (crossedNow && !today.alertedAt) {
      notify("60-minute Instagram budget hit", {
        body: `You've logged ${today.minutes} minutes on ${SCREEN_TIME_APP} today.`,
      });
      screenTimeRepo.markAlerted(date);
    }
  }, [today.minutes, today.alertedAt, limitMinutes, date, notify]);

  const over = today.minutes > limitMinutes;
  const pct = Math.min(100, Math.round((today.minutes / limitMinutes) * 100));

  return (
    <div className="space-y-3 rounded-card bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-sage">{SCREEN_TIME_APP} today</p>
        {supported && (
          <button type="button" onClick={requestPermission} className="text-sage" aria-label="Enable notifications">
            <BellIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-black ${over ? "text-red" : "text-ink"}`}>{today.minutes}</span>
        <span className="text-sm font-bold text-sage">/ {limitMinutes} min</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-sage/20">
        <div
          className={`h-full rounded-full ${over ? "bg-red" : "bg-charcoal"}`}
          style={{ width: `${pct}%`, transition: "width 0.3s ease" }}
        />
      </div>

      {over && (
        <p className="rounded-2xl bg-red/10 p-3 text-xs font-bold text-red">
          You're {today.minutes - limitMinutes} min over budget today. Maybe a good moment to put the phone down.
        </p>
      )}

      <div className="flex gap-2">
        {QUICK_ADDS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => screenTimeRepo.addMinutes(date, m)}
            className="h-10 flex-1 rounded-2xl border border-sage/30 bg-base text-xs font-bold text-ink"
          >
            +{m} min
          </button>
        ))}
        <button
          type="button"
          onClick={() => screenTimeRepo.reset(date)}
          className="h-10 shrink-0 rounded-2xl border border-sage/30 bg-base px-3 text-xs font-bold text-ink"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
