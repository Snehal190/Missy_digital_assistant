export default function BentoMetric({ label, value, Icon }) {
  return (
    <div className="rounded-2xl bg-surface/80 p-3 backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-wide text-sage">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {Icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red/10 text-red">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="text-sm font-bold text-ink">{value}</span>
      </div>
    </div>
  );
}
