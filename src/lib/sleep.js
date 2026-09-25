// Computes hours slept from "HH:mm" bedtime/wake times, handling the
// overnight wrap (bedtime in the evening, wake time the next morning).
export function computeSleepHours(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  const bedMinutes = bh * 60 + bm;
  let wakeMinutes = wh * 60 + wm;
  if (wakeMinutes <= bedMinutes) wakeMinutes += 24 * 60;
  return Math.round(((wakeMinutes - bedMinutes) / 60) * 10) / 10;
}
