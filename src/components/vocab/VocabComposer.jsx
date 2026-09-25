import { useState } from "react";
import { PlusIcon, SparkleIcon } from "../icons";
import { useDictation } from "../../hooks/useDictation";
import MicToggleButton from "../ui/MicToggleButton";
import { autofillVocab, VocabAutofillError } from "../../lib/api";

export default function VocabComposer({ onAdd }) {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState("");

  const wordDictation = useDictation({ value: word, onChange: setWord });
  const meaningDictation = useDictation({ value: meaning, onChange: setMeaning });
  const exampleDictation = useDictation({ value: example, onChange: setExample });

  const canAutofill = expanded && word.trim() && !meaning.trim() && !example.trim() && !autofilling;

  async function autofill() {
    setAutofilling(true);
    setAutofillError("");
    try {
      const [result] = await autofillVocab([word.trim()]);
      if (result) {
        setMeaning(result.meaning || "");
        setExample(result.example || "");
        setPartOfSpeech(result.partOfSpeech || "");
        setPronunciation(result.pronunciation || "");
      }
    } catch (err) {
      setAutofillError(err instanceof VocabAutofillError ? err.message : "Couldn't auto-fill. Try again.");
    } finally {
      setAutofilling(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!word.trim()) return;
    onAdd({
      word: word.trim(),
      meaning: meaning.trim(),
      example: example.trim(),
      partOfSpeech: partOfSpeech.trim(),
      pronunciation: pronunciation.trim(),
    });
    setWord("");
    setMeaning("");
    setExample("");
    setPartOfSpeech("");
    setPronunciation("");
    setAutofillError("");
    setExpanded(false);
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-card bg-surface p-4 shadow-soft">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder="New word…"
            className="h-11 w-full rounded-2xl border border-sage/30 bg-base px-3 pr-11 text-sm font-bold text-ink focus:border-ink focus:outline-none"
          />
          <MicToggleButton
            supported={wordDictation.supported}
            listening={wordDictation.listening}
            onClick={() => {
              setExpanded(true);
              wordDictation.toggle();
            }}
            size="h-7 w-7"
            className="absolute right-2 top-1/2 -translate-y-1/2"
          />
        </div>
        <button
          type="submit"
          disabled={!word.trim()}
          aria-label="Add word"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red text-white shadow-red-glow disabled:opacity-40"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
      {expanded && (
        <>
          {canAutofill && (
            <button
              type="button"
              onClick={autofill}
              disabled={autofilling}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-2xl border border-sage/30 bg-base text-xs font-bold text-ink disabled:opacity-60"
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              {autofilling ? "Asking Missy…" : "Auto-fill with AI"}
            </button>
          )}
          {autofillError && <p className="text-xs font-semibold text-red">{autofillError}</p>}
          <div className="relative">
            <input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="Meaning (optional)"
              className="h-11 w-full rounded-2xl border border-sage/30 bg-base px-3 pr-11 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
            />
            <MicToggleButton
              supported={meaningDictation.supported}
              listening={meaningDictation.listening}
              onClick={meaningDictation.toggle}
              size="h-7 w-7"
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          </div>
          <div className="relative">
            <input
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Example sentence (optional)"
              className="h-11 w-full rounded-2xl border border-sage/30 bg-base px-3 pr-11 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
            />
            <MicToggleButton
              supported={exampleDictation.supported}
              listening={exampleDictation.listening}
              onClick={exampleDictation.toggle}
              size="h-7 w-7"
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          </div>
          {(partOfSpeech || pronunciation) && (
            <div className="flex gap-2">
              <input
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                placeholder="Part of speech"
                className="h-10 w-1/2 rounded-2xl border border-sage/30 bg-base px-3 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
              />
              <input
                value={pronunciation}
                onChange={(e) => setPronunciation(e.target.value)}
                placeholder="Pronunciation hint"
                className="h-10 w-1/2 rounded-2xl border border-sage/30 bg-base px-3 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
              />
            </div>
          )}
        </>
      )}
    </form>
  );
}
