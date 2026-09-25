export class PlanDayError extends Error {}

export async function planDay(transcript, tags) {
  let res;
  try {
    res = await fetch("/api/plan-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, tags }),
    });
  } catch {
    throw new PlanDayError("Couldn't reach the planning service. Check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PlanDayError(body.error || "The planner couldn't structure that. Try again or add tasks manually.");
  }

  const data = await res.json();
  if (!Array.isArray(data.tasks)) {
    throw new PlanDayError("The planner returned something unexpected. Try again or add tasks manually.");
  }
  return data.tasks;
}

// Uploads a recorded audio blob for combined transcription + task
// extraction in one Gemini call. Returns { transcript, tasks }.
export async function planDayFromAudio(audioBlob, tags) {
  let res;
  try {
    const params = new URLSearchParams();
    if (tags?.length) params.set("tags", tags.join(","));
    res = await fetch(`/api/plan-day-audio?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": audioBlob.type || "audio/webm" },
      body: audioBlob,
    });
  } catch {
    throw new PlanDayError("Couldn't upload your recording. Check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PlanDayError(body.error || "Couldn't process that recording. Try again or switch to typing.");
  }

  const data = await res.json();
  if (!Array.isArray(data.tasks) || typeof data.transcript !== "string") {
    throw new PlanDayError("Got an unexpected response. Try again or switch to typing.");
  }
  return data;
}

export class VocabAutofillError extends Error {}

// Batch-friendly: pass one word or many. Returns results in the same order
// as the input, each { word, meaning, example, partOfSpeech, pronunciation }.
export async function autofillVocab(words) {
  let res;
  try {
    res = await fetch("/api/vocab-autofill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words }),
    });
  } catch {
    throw new VocabAutofillError("Couldn't reach the auto-fill service. Check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new VocabAutofillError(body.error || "Couldn't auto-fill those words. Try again or fill them in yourself.");
  }

  const data = await res.json();
  if (!Array.isArray(data.words)) {
    throw new VocabAutofillError("Got an unexpected response. Try again or fill them in yourself.");
  }
  return data.words;
}

export class InsightsExplainError extends Error {}

// Sends only aggregated daily numbers (never task titles, idea text, or
// vocab content) and returns { observations: string[], experiment: string }.
export async function explainPatterns(dailyRecords, categoryBreakdown) {
  let res;
  try {
    res = await fetch("/api/insights-explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyRecords, categoryBreakdown }),
    });
  } catch {
    throw new InsightsExplainError("Couldn't reach the insights service. Check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new InsightsExplainError(body.error || "Couldn't explain your patterns right now.");
  }

  const data = await res.json();
  if (!Array.isArray(data.observations) || typeof data.experiment !== "string") {
    throw new InsightsExplainError("Got an unexpected response. Try again.");
  }
  return data;
}

export class WeeklyReviewError extends Error {}

// `stats` is the week's aggregated numbers only; `ideaTitles` are first-line
// idea titles for the week — never full idea text, and never the journal.
export async function explainWeek(stats, ideaTitles) {
  let res;
  try {
    res = await fetch("/api/weekly-review-explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats, ideaTitles }),
    });
  } catch {
    throw new WeeklyReviewError("Couldn't reach the review service. Check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new WeeklyReviewError(body.error || "Couldn't generate a weekly review right now.");
  }

  const data = await res.json();
  if (!Array.isArray(data.observations) || typeof data.wentWell !== "string" || typeof data.focusSuggestion !== "string") {
    throw new WeeklyReviewError("Got an unexpected response. Try again.");
  }
  return data;
}

export class SleepInsightError extends Error {}

export async function getSleepInsight(entries) {
  let res;
  try {
    res = await fetch("/api/sleep-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
  } catch {
    throw new SleepInsightError("Couldn't reach the insight service. Check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new SleepInsightError(body.error || "Couldn't generate an insight right now.");
  }

  const data = await res.json();
  if (typeof data.insight !== "string") {
    throw new SleepInsightError("Got an unexpected response. Try again.");
  }
  return data.insight;
}
