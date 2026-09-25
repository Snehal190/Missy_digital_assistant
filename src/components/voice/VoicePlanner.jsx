import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Modal from "../ui/Modal";
import SchedulePreviewItem from "./SchedulePreviewItem";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { planDay, planDayFromAudio, PlanDayError } from "../../lib/api";
import { tasksRepo, settingsRepo } from "../../db/repository";
import { todayStr } from "../../lib/dates";
import { MicIcon } from "../icons";

function dedupe(tasks) {
  const seen = new Map();
  for (const t of tasks) {
    const key = t.title.trim().toLowerCase();
    const existing = seen.get(key);
    if (!existing || (!existing.time && t.time)) seen.set(key, t);
  }
  return [...seen.values()];
}

function toItems(tasks, tags) {
  return dedupe(tasks).map((t, i) => ({
    _key: i,
    title: t.title || "Untitled",
    time: t.time || "",
    duration: t.duration || null,
    priority: t.priority || "Medium",
    category: tags.includes(t.category) ? t.category : tags[0],
  }));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function LevelMeter({ level }) {
  const bars = [0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.55, 0.85, 0.65, 0.5];
  return (
    <div className="flex h-16 items-end justify-center gap-1">
      {bars.map((mult, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-red"
          style={{ height: `${Math.max(10, level * 100 * mult)}%`, transition: "height 0.1s ease" }}
        />
      ))}
    </div>
  );
}

export default function VoicePlanner({ onClose, onSaved }) {
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  const tags = settings?.tagList || ["Work", "Health", "Learning", "Personal"];
  const recorder = useAudioRecorder();

  const [stage, setStage] = useState("idle"); // idle | recording | uploading | preview | error
  const [manualMode, setManualMode] = useState(!recorder.supported);
  const [manualText, setManualText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const remaining = recorder.maxDuration - recorder.elapsed;

  // Only advance to the "recording" UI once getUserMedia has actually
  // succeeded — awaiting recorder.start() and then unconditionally setting
  // the stage would show a frozen "recording" screen on permission denial,
  // since the hook swallows that error internally rather than throwing.
  useEffect(() => {
    if (recorder.recording && stage === "idle") setStage("recording");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.recording]);

  // MediaRecorder.stop() is async — the blob only exists once `onstop` fires.
  // As soon as it does (while we're still showing the recording UI), kick
  // off the upload automatically, matching "on stop, POST the audio blob".
  useEffect(() => {
    if (stage === "recording" && recorder.audioBlob) {
      uploadRecording(recorder.audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.audioBlob, stage]);

  async function uploadRecording(blob) {
    setStage("uploading");
    try {
      const result = await planDayFromAudio(blob, tags);
      setTranscript(result.transcript);
      setShowTranscript(false);
      setItems(toItems(result.tasks, tags));
      setStage("preview");
    } catch (err) {
      setErrorMsg(err instanceof PlanDayError ? err.message : "Something went wrong structuring your day.");
      setStage("error");
    }
  }

  async function submitManualText() {
    const text = manualText.trim();
    if (!text) return;
    setStage("uploading");
    try {
      const tasks = await planDay(text, tags);
      setTranscript(text);
      setShowTranscript(false);
      setItems(toItems(tasks, tags));
      setStage("preview");
    } catch (err) {
      setErrorMsg(err instanceof PlanDayError ? err.message : "Something went wrong structuring your day.");
      setStage("error");
    }
  }

  function updateItem(index, next) {
    setItems((list) => list.map((it, i) => (i === index ? next : it)));
  }
  function removeItem(index) {
    setItems((list) => list.filter((_, i) => i !== index));
  }
  function moveItem(from, to) {
    setItems((list) => {
      const copy = [...list];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  async function confirmSave() {
    const date = todayStr();
    await tasksRepo.createMany(
      items
        .filter((it) => it.title.trim())
        .map((it) => ({
          title: it.title.trim(),
          time: it.time || null,
          duration: it.duration || null,
          priority: it.priority,
          category: it.category,
          status: "Not started",
          date,
          source: "voice",
        })),
    );
    onSaved();
  }

  return (
    <Modal title="Speak your day" onClose={onClose}>
      {stage === "idle" && (
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold text-sage">
            Talk through everything on your mind for today — no format needed, code-switch freely. Missy will
            turn it into a schedule.
          </p>

          {!manualMode ? (
            <>
              <button
                type="button"
                onClick={() => recorder.start()}
                className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-red text-white shadow-red-glow"
              >
                <MicIcon className="h-9 w-9" />
              </button>
              {recorder.error === "permission-denied" && (
                <p className="text-xs font-semibold text-red">
                  Microphone access was denied. Allow it in your browser, or type instead.
                </p>
              )}
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-xs font-bold text-sage underline underline-offset-2"
              >
                Type instead
              </button>
            </>
          ) : (
            <div className="space-y-3 text-left">
              {!recorder.supported && (
                <p className="text-xs font-semibold text-red">Voice recording isn't supported in this browser.</p>
              )}
              <textarea
                autoFocus
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={6}
                placeholder="Gym at 7, then I need to review the Q3 deck, call mom sometime, read for 30 min…"
                className="w-full rounded-2xl border border-sage/30 bg-surface p-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
              />
              <div className="flex gap-2">
                {recorder.supported && (
                  <button
                    type="button"
                    onClick={() => setManualMode(false)}
                    className="h-12 shrink-0 rounded-2xl border border-sage/30 bg-surface px-4 text-sm font-bold text-ink"
                  >
                    Use mic
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitManualText}
                  disabled={!manualText.trim()}
                  className="h-12 flex-1 rounded-2xl bg-red text-sm font-bold text-white shadow-red-glow disabled:opacity-40"
                >
                  Build my schedule
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === "recording" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red/10">
            <span className="h-16 w-16 animate-pulse rounded-full bg-red/30" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-red">Recording…</p>

          <LevelMeter level={recorder.level} />

          <p className={`text-2xl font-black ${remaining <= 30 ? "text-red" : "text-ink"}`}>
            {formatTime(recorder.elapsed)}
            <span className="text-sm font-bold text-sage"> / {formatTime(recorder.maxDuration)}</span>
          </p>
          {remaining <= 30 && (
            <p className="text-xs font-bold text-red">{remaining}s left — auto-stopping soon</p>
          )}

          <button type="button" onClick={recorder.stop} className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white">
            Stop recording
          </button>
        </div>
      )}

      {stage === "uploading" && (
        <div className="space-y-3 py-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sage/30 border-t-red" />
          <p className="text-sm font-semibold text-sage">Transcribing & structuring your day…</p>
        </div>
      )}

      {stage === "error" && (
        <div className="space-y-4">
          <p className="text-center text-sm font-semibold text-red">{errorMsg}</p>

          {recorder.audioBlob && !manualMode && (
            <p className="rounded-2xl bg-sage/10 p-3 text-center text-xs font-semibold text-ink">
              Your {formatTime(recorder.elapsed)} recording is still saved — retry, or switch to typing without
              losing it.
            </p>
          )}

          {manualMode ? (
            <div className="space-y-3 text-left">
              <textarea
                autoFocus
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={5}
                placeholder="Type what you wanted to say…"
                className="w-full rounded-2xl border border-sage/30 bg-surface p-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
              />
              <div className="flex gap-2">
                {recorder.audioBlob && (
                  <button
                    type="button"
                    onClick={() => setManualMode(false)}
                    className="h-12 shrink-0 rounded-2xl border border-sage/30 bg-surface px-4 text-sm font-bold text-ink"
                  >
                    Back to recording
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitManualText}
                  disabled={!manualText.trim()}
                  className="h-12 flex-1 rounded-2xl bg-red text-sm font-bold text-white shadow-red-glow disabled:opacity-40"
                >
                  Build my schedule
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {recorder.audioBlob ? (
                <button
                  type="button"
                  onClick={() => uploadRecording(recorder.audioBlob)}
                  className="h-12 flex-1 rounded-2xl bg-red text-sm font-bold text-white shadow-red-glow"
                >
                  Retry upload
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    recorder.reset();
                    setStage("idle");
                  }}
                  className="h-12 flex-1 rounded-2xl bg-red text-sm font-bold text-white shadow-red-glow"
                >
                  Record again
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setManualMode(true);
                  setManualText("");
                }}
                className="h-12 flex-1 rounded-2xl border border-sage/30 bg-surface text-sm font-bold text-ink"
              >
                Type instead
              </button>
            </div>
          )}
        </div>
      )}

      {stage === "preview" && (
        <div className="space-y-3">
          {transcript && (
            <div className="rounded-2xl border border-sage/20 bg-sage/10 p-3">
              <button
                type="button"
                onClick={() => setShowTranscript((s) => !s)}
                className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wide text-sage"
              >
                What Missy heard
                <span>{showTranscript ? "Hide" : "Show"}</span>
              </button>
              {showTranscript && <p className="mt-2 text-sm font-medium text-ink">{transcript}</p>}
            </div>
          )}

          <p className="text-xs font-semibold text-sage">
            Review and tweak before saving — drag the handle to reorder.
          </p>
          {items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-sage/40 p-4 text-center text-sm font-semibold text-sage">
              Nothing left to add.
            </p>
          )}
          <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
            {items.map((item, i) => (
              <SchedulePreviewItem
                key={item._key}
                item={item}
                index={i}
                tags={tags}
                onChange={(next) => updateItem(i, next)}
                onRemove={() => removeItem(i)}
                onMove={moveItem}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={confirmSave}
            className="h-12 w-full rounded-2xl bg-red text-sm font-bold text-white shadow-red-glow"
          >
            Save today's plan
          </button>
        </div>
      )}
    </Modal>
  );
}
