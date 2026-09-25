import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { formatShort } from "../../lib/dates";
import { RECOMMENDED_SLEEP_HOURS } from "../../config/constants";

export default function SleepTrendChart({ entries }) {
  const data = entries.map((e) => ({ ...e, label: formatShort(e.date) }));

  return (
    <div className="h-56 w-full rounded-card bg-surface p-4 shadow-soft">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sage">Sleep trend (hours)</p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#b7c6c2" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#b7c6c2" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: "#b7c6c2" }} axisLine={false} tickLine={false} width={28} />
          <ReferenceLine y={RECOMMENDED_SLEEP_HOURS} stroke="#b7c6c2" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--color-sage)",
              background: "var(--color-surface)",
              fontSize: 12,
              fontWeight: 700,
            }}
            labelStyle={{ color: "var(--color-ink)" }}
          />
          <Line type="monotone" dataKey="hours" stroke="#ca0013" strokeWidth={3} dot={{ r: 3, fill: "#ca0013" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
