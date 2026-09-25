import { useState } from "react";
import { MOOD_SCALE } from "../../config/constants";
import { useDictation } from "../../hooks/useDictation";
import MicToggleButton from "../ui/MicToggleButton";

const VOICE_NOTICE_KEY = "missy-journal-voice-notice-seen";

export default function JournalComposer({ onSave }) {
  const [text, setText] = useState("");
  const [mood, setMood] = useState(null);
  const [showVoiceNotice, setShowVoiceNotice] = useState(() => {
    try {
      return !localStorage.getItem(VOICE_NOTICE_KEY);
    } catch {
      return true;
    }
  });
  const dictation = useDictation({ value: text, onChange: setText });

  function dismissVoiceNotice() {
    setShowVoiceNotice(false);
    try {
      localStorage.setItem(VOICE_NOTICE_KEY, "1");
    } catch {
      // ignore
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSave({ text: text.trim(), mood });
    setText("");
    setMood(null);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-card bg-surface p-5 shadow-soft">
      {showVoiceNotice && dictation.supported && (
        <div className="rounded-2xl bg-sage/10 p-3 text-xs font-semibold text-ink">
          Typed text here is encrypted locally. Voice dictation is different — it's processed by your browser's
          speech service (a cloud provider) before the words reach this app.
          <button type="button" onClick={dismissVoiceNotice} className="mt-2 block font-bold underline">
            Got it
          </button>
        </div>
      )}

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          rows={6}
          placeholder="What's on your mind…"
          className="w-full resize-none rounded-2xl border border-sage/20 bg-base px-4 py-3 pr-12 text-sm font-medium leading-relaxed text-ink focus:border-sage/50 focus:outline-none"
        />
        <MicToggleButton
          supported={dictation.supported}
          listening={dictation.listening}
          onClick={dictation.toggle}
          className="absolute right-2 top-2"
        />
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sage">How are you feeling?</p>
        <div className="flex gap-2">
          {MOOD_SCALE.map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setMood(mood === m.value ? null : m.value)}
              className={`flex-1 rounded-2xl border py-2 text-xs font-bold ${
                mood === m.value ? "border-transparent bg-sage/40 text-ink" : "border-sage/20 bg-base text-sage"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!text.trim()}
        className="h-12 w-full rounded-2xl bg-charcoal text-sm font-bold text-white disabled:opacity-40"
      >
        Save entry
      </button>
    </form>
  );
}
