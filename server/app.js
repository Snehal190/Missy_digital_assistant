import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Recordings are capped client-side at 3 minutes of opus/aac speech, so this
// is a generous margin — real recordings should never get near it. Anything
// over goes through the Files API instead of inline base64.
const INLINE_AUDIO_LIMIT_BYTES = 15 * 1024 * 1024;

class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Shared call to Gemini's structured-output endpoint. `parts` is the array
// of content parts for the single user turn (text, and/or inline_data /
// file_data for audio). Throws GeminiError with a user-safe message on any
// failure; callers just need to catch and forward it.
async function callGemini({ system, parts, responseSchema }) {
  if (!GEMINI_API_KEY) {
    throw new GeminiError("Server is missing GEMINI_API_KEY. Add it to your .env file.", 500);
  }

  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    });
  } catch (err) {
    console.error("Gemini request failed:", err);
    throw new GeminiError("Couldn't reach the planning model right now.", 502);
  }

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Gemini API error:", response.status, errBody);
    const message =
      response.status === 400 || response.status === 403
        ? "The model rejected the request — check that GEMINI_API_KEY is valid."
        : "The model couldn't be reached right now.";
    throw new GeminiError(message, 502);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("The model's response wasn't structured JSON.", 502);
  }
}

// Gemini Files API resumable upload — used when a recording is too big to
// send inline. Returns the file's URI for use in a file_data part.
async function uploadToFilesAPI(buffer, mimeType) {
  const startRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": GEMINI_API_KEY,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(buffer.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "missy-voice-recording" } }),
  });
  if (!startRes.ok) throw new GeminiError("Couldn't start the audio upload.", 502);

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new GeminiError("Audio upload didn't return an upload URL.", 502);

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(buffer.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: buffer,
  });
  if (!uploadRes.ok) throw new GeminiError("Couldn't finish the audio upload.", 502);

  const file = await uploadRes.json();
  const uri = file.file?.uri;
  if (!uri) throw new GeminiError("Audio upload didn't return a file reference.", 502);
  return uri;
}

function handleGeminiError(res, err) {
  if (err instanceof GeminiError) return res.status(err.status).json({ error: err.message });
  console.error("Unexpected error:", err);
  return res.status(500).json({ error: "Something went wrong." });
}

// ---------- Voice → schedule planning ----------

const PLAN_SYSTEM_PROMPT = `You turn a rambling spoken-day dump into a structured daily schedule.

Rules:
- Extract each distinct task/goal the person mentions.
- If they gave an explicit time, use it (24h "HH:mm"). If not, infer a reasonable time based on typical energy patterns: deep/focused work in the morning, meetings/admin around midday, lighter or physical tasks in the afternoon, wind-down/reading in the evening — unless the person stated their own preference, which always wins.
- Give each task a reasonable duration in minutes if inferable, else null.
- Assign a priority of "High", "Medium", or "Low" if inferable from urgency/emphasis, otherwise "Medium".
- Do not invent tasks the person didn't mention. Do not merge unrelated tasks together.

Categorizing (this is the part people get wrong most, be careful):
- Categorize by the NATURE OF THE ACTIVITY, never by the topic's domain alone. The question is "what is the person actually doing", not "what subject is this about".
- Studying, reading about, researching, taking a course on, or practicing a skill in ANY subject — including work-adjacent subjects like marketing, coding, finance, or management — is Learning, not Work. Example: "read a marketing chapter" or "watch a course on public speaking" -> Learning.
- Work is for actually executing job responsibilities: meetings, client deliverables, writing a real campaign/report/email for your job, standups, admin tied to your job.
- Health is physical or mental wellbeing: exercise, medical appointments, meditation, sleep-related tasks.
- Personal is everyday life admin and relationships not covered above: errands, chores, calling family/friends, hobbies done for fun rather than to learn a skill.
- Assign a category from this exact list when it fits: {{TAGS}}. If the list has been customized and none fit well, pick the closest one by the same nature-of-activity logic above.`;

const PLAN_AUDIO_PREAMBLE = `You will first listen to an audio recording, then do two things with it.

The speaker is an Indian English speaker who may freely code-switch into Hindi or Hinglish mid-sentence. Transcribe naturally the way a person would actually write it down (a normal mixed English/Hinglish transcript, not a stilted formal translation) — and when extracting tasks below, go by the MEANING of what they said regardless of which language/mix it was said in, not a literal word-for-word reading.

Step 1 — transcribe what was said as best you can, into the "transcript" field.
Step 2 — from that same meaning, extract the day's tasks into the "tasks" field, using the exact rules below.

`;

const PLAN_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          time: { type: "string", nullable: true, description: '24h "HH:mm", or null' },
          duration: { type: "number", nullable: true, description: "minutes, or null" },
          priority: { type: "string", enum: ["High", "Medium", "Low"] },
          category: { type: "string" },
        },
        required: ["title", "priority", "category"],
      },
    },
  },
  required: ["tasks"],
};

const PLAN_AUDIO_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    transcript: { type: "string", description: "Best-effort transcript of the audio." },
    tasks: PLAN_RESPONSE_SCHEMA.properties.tasks,
  },
  required: ["transcript", "tasks"],
};

function tagListFrom(value) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const cleaned = list.map((t) => String(t).trim()).filter(Boolean);
  return cleaned.length ? cleaned : ["Work", "Health", "Learning", "Personal"];
}

// Text transcript -> schedule. Used by the manual "type instead" fallback,
// and as the fallback path if audio upload fails.
app.post("/api/plan-day", async (req, res) => {
  const { transcript, tags } = req.body || {};
  if (typeof transcript !== "string" || !transcript.trim()) {
    return res.status(400).json({ error: "Missing transcript." });
  }

  const system = PLAN_SYSTEM_PROMPT.replace("{{TAGS}}", tagListFrom(tags).join(", "));

  try {
    const parsed = await callGemini({
      system,
      parts: [{ text: transcript.slice(0, 8000) }],
      responseSchema: PLAN_RESPONSE_SCHEMA,
    });
    if (!Array.isArray(parsed.tasks)) {
      return res.status(502).json({ error: "The planner didn't return a task list." });
    }
    return res.json(parsed);
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

// Raw audio -> transcript + schedule, in one Gemini call. Body is the raw
// audio bytes (client sets Content-Type to the recording's real mime type);
// tags come via query string since the body isn't JSON here.
app.post("/api/plan-day-audio", express.raw({ type: () => true, limit: "30mb" }), async (req, res) => {
  const audio = req.body;
  if (!Buffer.isBuffer(audio) || audio.length === 0) {
    return res.status(400).json({ error: "No audio received." });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it to your .env file." });
  }

  const mimeType = req.headers["content-type"] || "audio/webm";
  const tagList = tagListFrom(req.query.tags);
  const system = PLAN_AUDIO_PREAMBLE + PLAN_SYSTEM_PROMPT.replace("{{TAGS}}", tagList.join(", "));

  try {
    const audioPart =
      audio.length > INLINE_AUDIO_LIMIT_BYTES
        ? { file_data: { mime_type: mimeType, file_uri: await uploadToFilesAPI(audio, mimeType) } }
        : { inline_data: { mime_type: mimeType, data: audio.toString("base64") } };

    const parsed = await callGemini({
      system,
      parts: [audioPart],
      responseSchema: PLAN_AUDIO_RESPONSE_SCHEMA,
    });

    if (!Array.isArray(parsed.tasks) || typeof parsed.transcript !== "string") {
      return res.status(502).json({ error: "The planner didn't return a usable result." });
    }
    return res.json(parsed);
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

// ---------- Sleep insight ----------

const SLEEP_SYSTEM_PROMPT = `You are a supportive sleep coach. You'll be given a JSON list of recent nights (date, bedtime, wakeTime, hours slept, optional 1-5 quality, optional notes) for one person, most recent last.

Write a short, encouraging, specific insight:
- Notice real patterns in THIS data (e.g. consistently short nights, big bedtime swings, weekday vs weekend gaps, a trend of improvement or decline). Don't give generic advice unrelated to what's actually there.
- Give exactly 1-2 concrete, actionable suggestions for improving sleep, tailored to the pattern you noticed.
- Keep it warm and non-judgmental, 2-4 sentences total, no bullet points, no headers.
- If there's too little data to say anything specific, say so briefly and encourage logging a few more nights.`;

const SLEEP_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    insight: { type: "string" },
  },
  required: ["insight"],
};

app.post("/api/sleep-insight", async (req, res) => {
  const { entries } = req.body || {};
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "No sleep entries to analyze yet." });
  }

  try {
    const parsed = await callGemini({
      system: SLEEP_SYSTEM_PROMPT,
      parts: [{ text: JSON.stringify(entries) }],
      responseSchema: SLEEP_RESPONSE_SCHEMA,
    });
    if (typeof parsed.insight !== "string") {
      return res.status(502).json({ error: "The sleep coach didn't return a usable insight." });
    }
    return res.json(parsed);
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

// ---------- Vocabulary auto-fill ----------

const VOCAB_AUTOFILL_SYSTEM_PROMPT = `You help someone fill in dictionary-style details for vocabulary words they're learning.
You'll receive a JSON array of English words/phrases. For each one, return:
- meaning: a concise, plain-English definition (one sentence, no jargon).
- example: one natural example sentence using the word.
- partOfSpeech: e.g. "noun", "verb", "adjective", "phrase".
- pronunciation: a simple phonetic hint a non-linguist can read aloud (e.g. "eh-FEM-er-ul"), not IPA.
Return exactly one entry per input word, in the same order, with the "word" field echoing the input exactly.`;

const VOCAB_AUTOFILL_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          meaning: { type: "string" },
          example: { type: "string" },
          partOfSpeech: { type: "string" },
          pronunciation: { type: "string" },
        },
        required: ["word", "meaning", "example", "partOfSpeech", "pronunciation"],
      },
    },
  },
  required: ["words"],
};

// Capped well above any realistic single "fill missing meanings" batch, just
// to keep the prompt/response bounded.
const MAX_AUTOFILL_WORDS = 25;

app.post("/api/vocab-autofill", async (req, res) => {
  const words = Array.isArray(req.body?.words)
    ? req.body.words.map((w) => String(w).trim()).filter(Boolean).slice(0, MAX_AUTOFILL_WORDS)
    : [];
  if (words.length === 0) return res.status(400).json({ error: "No words provided." });

  try {
    const parsed = await callGemini({
      system: VOCAB_AUTOFILL_SYSTEM_PROMPT,
      parts: [{ text: JSON.stringify(words) }],
      responseSchema: VOCAB_AUTOFILL_RESPONSE_SCHEMA,
    });
    if (!Array.isArray(parsed.words)) {
      return res.status(502).json({ error: "The auto-fill didn't return usable results." });
    }
    return res.json(parsed);
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

// ---------- Cross-signal insights ----------

const INSIGHTS_SYSTEM_PROMPT = `You are a data-savvy, warm personal coach. You'll receive a JSON object with:
- dailyRecords: up to 30 days of one person's aggregated daily stats (date, score, sleepHours, screenMinutes, tasksCompleted, tasksPlanned). Most recent last.
- categoryBreakdown: their task completion totals per category over that period.
You will NEVER receive task titles, journal text, or vocabulary content — only these numbers.

Write:
- 3 to 5 short, specific observations about real patterns in THIS data (e.g. a sleep/score relationship, a weekday effect, a category that's neglected). Every observation must be traceable to the numbers given — don't invent patterns that aren't there.
- Exactly one concrete, specific experiment to try next week, based on the strongest pattern you found.

Critical rule: describe these as observed patterns/correlations, never as causal claims. Do not write things like "sleeping more makes you more productive" — instead "your scores were higher on nights with more sleep." Keep the tone encouraging and non-judgmental, no jargon.`;

const INSIGHTS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    observations: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    experiment: { type: "string" },
  },
  required: ["observations", "experiment"],
};

app.post("/api/insights-explain", async (req, res) => {
  const { dailyRecords, categoryBreakdown } = req.body || {};
  if (!Array.isArray(dailyRecords) || dailyRecords.length === 0) {
    return res.status(400).json({ error: "Not enough logged days yet to explain patterns." });
  }

  try {
    const parsed = await callGemini({
      system: INSIGHTS_SYSTEM_PROMPT,
      parts: [{ text: JSON.stringify({ dailyRecords, categoryBreakdown: categoryBreakdown || [] }) }],
      responseSchema: INSIGHTS_RESPONSE_SCHEMA,
    });
    if (!Array.isArray(parsed.observations) || typeof parsed.experiment !== "string") {
      return res.status(502).json({ error: "Didn't get a usable set of observations." });
    }
    return res.json(parsed);
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

// ---------- Weekly review ----------

const WEEKLY_REVIEW_SYSTEM_PROMPT = `You are a warm, specific personal coach writing a weekly recap. You'll receive one week's aggregated stats (average score, tasks completed/planned, category breakdown of completed tasks, ideas/words counts, average sleep, screen time vs budget) plus the titles (first line only) of ideas logged that week. You will NEVER receive the private journal or full idea text — only these.

Write:
- observations: exactly 3 short, specific observations about the week, grounded in the actual numbers/titles given.
- wentWell: exactly 1 sentence naming something that went well and is worth repeating.
- focusSuggestion: exactly 1 specific, actionable focus for next week.

Keep the tone encouraging and non-judgmental. Describe patterns as observations, not causal claims.`;

const WEEKLY_REVIEW_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    observations: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
    wentWell: { type: "string" },
    focusSuggestion: { type: "string" },
  },
  required: ["observations", "wentWell", "focusSuggestion"],
};

app.post("/api/weekly-review-explain", async (req, res) => {
  const { stats, ideaTitles } = req.body || {};
  if (!stats || typeof stats !== "object") {
    return res.status(400).json({ error: "Missing week stats." });
  }

  try {
    const parsed = await callGemini({
      system: WEEKLY_REVIEW_SYSTEM_PROMPT,
      parts: [{ text: JSON.stringify({ stats, ideaTitles: ideaTitles || [] }) }],
      responseSchema: WEEKLY_REVIEW_RESPONSE_SCHEMA,
    });
    if (!Array.isArray(parsed.observations) || typeof parsed.wentWell !== "string" || typeof parsed.focusSuggestion !== "string") {
      return res.status(502).json({ error: "Didn't get a usable weekly review." });
    }
    return res.json(parsed);
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, hasApiKey: Boolean(GEMINI_API_KEY) }));

export default app;
