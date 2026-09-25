import { DEFAULT_QUOTES } from "./quotes";

// Deterministic "quote of the day" — same quote all day for a given date
// string, so it matches between the Today screen and the evening review.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getQuoteOfTheDay(dateStr, customQuotes = []) {
  const pool = [...DEFAULT_QUOTES, ...customQuotes];
  const index = hashString(dateStr) % pool.length;
  return pool[index];
}
