import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatShort } from "../../lib/dates";

export default function ScoreTrendChart({ scores }) {
  const data = scores.map((s) => ({ ...s, label: formatShort(s.date) }));

  return (
    <div className="h-56 w-full rounded-card bg-surface p-4 shadow-soft">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sage">Score trend</p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#b7c6c2" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#b7c6c2" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#b7c6c2" }} axisLine={false} tickLine={false} width={28} />
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
          <Line type="monotone" dataKey="score" stroke="#ca0013" strokeWidth={3} dot={{ r: 3, fill: "#ca0013" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
