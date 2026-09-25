// A broken/never-started streak is framed as an invitation ("Start today"),
// never a red failure state — see Phase 2 #7's requirement that breaking a
// streak stays encouraging and forward-looking.
export default function StreakChip({ emoji, label, count, recovering }) {
  return (
    <div className="rounded-2xl border border-sage/30 bg-surface px-3 py-3 text-center">
      <p className="text-xl font-black text-ink">{count > 0 ? `${emoji} ${count}` : "🌱"}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-sage">{label}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-sage">
        {count === 0 ? "Start today" : recovering ? "Recovering" : "Going strong"}
      </p>
    </div>
  );
}
