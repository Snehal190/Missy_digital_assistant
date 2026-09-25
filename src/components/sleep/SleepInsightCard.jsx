import { useState } from "react";
import { getSleepInsight, SleepInsightError } from "../../lib/api";
import { SparkleIcon } from "../icons";

export default function SleepInsightCard({ entries }) {
  const [insight, setInsight] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");

  async function fetchInsight() {
    setStatus("loading");
    try {
      const text = await getSleepInsight(
        entries.map((e) => ({
          date: e.date,
          bedtime: e.bedtime,
          wakeTime: e.wakeTime,
          hours: e.hours,
          quality: e.quality,
        })),
      );
      setInsight(text);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof SleepInsightError ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-card bg-charcoal p-4 text-white shadow-soft">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10">
          <SparkleIcon className="h-4 w-4 text-white" />
        </span>
        <p className="text-xs font-bold uppercase tracking-wide text-sage">AI sleep insight</p>
      </div>

      {insight && <p className="mt-3 text-sm font-semibold">{insight}</p>}
      {status === "error" && <p className="mt-3 text-sm font-semibold text-red-300">{errorMsg}</p>}

      <button
        type="button"
        onClick={fetchInsight}
        disabled={status === "loading" || entries.length === 0}
        className="mt-3 h-10 w-full rounded-2xl bg-white/10 text-xs font-bold text-white disabled:opacity-40"
      >
        {status === "loading" ? "Thinking…" : insight ? "Refresh insight" : "Get insight from my sleep log"}
      </button>
    </div>
  );
}
