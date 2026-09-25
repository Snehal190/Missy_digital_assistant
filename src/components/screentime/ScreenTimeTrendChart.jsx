import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { formatShort } from "../../lib/dates";

export default function ScreenTimeTrendChart({ entries, limitMinutes }) {
  const data = entries.map((e) => ({ ...e, label: formatShort(e.date) }));

  return (
    <div className="h-56 w-full rounded-card bg-surface p-4 shadow-soft">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sage">Daily minutes</p>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#b7c6c2" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#b7c6c2" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#b7c6c2" }} axisLine={false} tickLine={false} width={28} />
          <ReferenceLine y={limitMinutes} stroke="#ca0013" strokeDasharray="4 4" />
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
          <Bar dataKey="minutes" radius={[8, 8, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.minutes > limitMinutes ? "#ca0013" : "#b7c6c2"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
