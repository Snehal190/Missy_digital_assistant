import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackHeader from "../components/layout/BackHeader";
import HistoryDayRow from "../components/history/HistoryDayRow";
import { historyRepo } from "../db/repository";
import { monthKey, formatMonthLabel, startOfNextMonthStr } from "../lib/dates";

const PAGE_SIZE = 30;

export default function History() {
  const [days, setDays] = useState([]);
  const [cursor, setCursor] = useState(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("");
  const sentinelRef = useRef(null);

  // Filter changed (or on mount): reload from scratch, anchored either at
  // "now" or at the end of the chosen month.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const before = monthFilter ? startOfNextMonthStr(monthFilter) : undefined;
      const page = await historyRepo.listDaySummaries({ before, limit: PAGE_SIZE });
      if (cancelled) return;
      setDays(page);
      setCursor(page.length ? page[page.length - 1].date : undefined);
      setHasMore(page.length === PAGE_SIZE);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [monthFilter]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoading(true);
    const page = await historyRepo.listDaySummaries({ before: cursor, limit: PAGE_SIZE });
    setDays((d) => [...d, ...page]);
    setCursor(page.length ? page[page.length - 1].date : undefined);
    setHasMore(page.length === PAGE_SIZE);
    setLoading(false);
  }, [cursor]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const groups = useMemo(() => {
    const out = [];
    for (const day of days) {
      const key = monthKey(day.date);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(day);
      else out.push({ key, label: formatMonthLabel(key), items: [day] });
    }
    return out;
  }, [days]);

  return (
    <div className="space-y-5 pb-6">
      <BackHeader to="/settings" eyebrow="Look back" title="History" />

      <div className="flex items-center gap-2 px-5">
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="h-11 flex-1 rounded-2xl border border-sage/30 bg-surface px-3 text-sm font-bold text-ink focus:border-ink focus:outline-none"
        />
        {monthFilter && (
          <button
            type="button"
            onClick={() => setMonthFilter("")}
            className="h-11 shrink-0 rounded-2xl border border-sage/30 bg-surface px-4 text-xs font-bold text-ink"
          >
            Latest
          </button>
        )}
      </div>

      {groups.length === 0 && !loading && (
        <div className="mx-5 rounded-card border border-dashed border-sage/40 bg-surface p-8 text-center text-sm font-semibold text-sage">
          {monthFilter ? "Nothing recorded that month." : "End your first day to start building history."}
        </div>
      )}

      {groups.map((group) => (
        <div key={group.key}>
          <div className="sticky top-0 z-10 bg-base/95 px-5 py-2 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wide text-sage">{group.label}</p>
          </div>
          <div className="space-y-2.5 px-5">
            {group.items.map((day) => (
              <HistoryDayRow key={day.date} day={day} />
            ))}
          </div>
        </div>
      ))}

      <div ref={sentinelRef} />
      {loading && <p className="px-5 text-center text-xs font-semibold text-sage">Loading…</p>}
    </div>
  );
}
