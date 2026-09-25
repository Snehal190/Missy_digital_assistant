// Parses shorthand like "Gym 7am", "Call mom at 3:30pm", "Standup 9" into
// { title, time } where time is "HH:mm" (24h) or null if nothing recognizable.
const TIME_RE =
  /\s*(?:@|at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i;

export function parseQuickAdd(raw) {
  const input = raw.trim();
  const match = input.match(TIME_RE);
  if (!match) {
    return { title: input, time: null };
  }

  const [, hourStr, minStr, meridiem] = match;
  let hour = parseInt(hourStr, 10);
  const minute = minStr ? parseInt(minStr, 10) : 0;

  if (hour > 23 || minute > 59) {
    return { title: input, time: null };
  }
  // Bare numbers with no am/pm/colon are too ambiguous unless they look like
  // a clock time (has a colon) or came with an explicit meridiem/@-marker.
  if (!meridiem && !minStr && !/@|at\s*\d{1,2}\s*$/i.test(input)) {
    return { title: input, time: null };
  }

  if (meridiem) {
    const isPM = meridiem.toLowerCase() === "pm";
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
  }

  const title = input.slice(0, match.index).trim();
  if (!title) return { title: input, time: null };

  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { title, time };
}
