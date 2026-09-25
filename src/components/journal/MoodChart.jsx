import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { MOOD_SCALE } from "../../config/constants";

export default function MoodChart({ entries }) {
  const data = entries
    .filter((e) => e.mood)
    .map((e) => ({ label: format(parseISO(e.createdAt), "MMM d"), mood: e.mood }))
    .reverse();

  if (data.length < 2) return null;

  return (
    <div className="h-48 w-full rounded-card bg-surface p-4 shadow-soft">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sage">Mood over time</p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-sage)" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-sage)" }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tickFormatter={(v) => MOOD_SCALE.find((m) => m.value === v)?.label[0] || v}
            tick={{ fontSize: 10, fill: "var(--color-sage)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            formatter={(value) => MOOD_SCALE.find((m) => m.value === value)?.label || value}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--color-sage)",
              background: "var(--color-surface)",
              fontSize: 12,
              fontWeight: 700,
            }}
            labelStyle={{ color: "var(--color-ink)" }}
          />
          <Line type="monotone" dataKey="mood" stroke="var(--color-sage)" strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
