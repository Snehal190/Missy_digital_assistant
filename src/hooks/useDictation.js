import { useEffect, useRef } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";

// Wraps useSpeechRecognition to dictate directly into a text field: toggling
// on appends to whatever was already typed, rather than overwriting it.
export function useDictation({ value, onChange }) {
  const speech = useSpeechRecognition();
  const baseRef = useRef("");
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!speech.listening) return;
    onChangeRef.current(baseRef.current + speech.transcript);
    // Only re-run when the live transcript (or listening state) changes —
    // `onChange` is typically a fresh inline function every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript, speech.listening]);

  function toggle() {
    if (speech.listening) {
      speech.stop();
      return;
    }
    baseRef.current = valueRef.current ? `${valueRef.current.trim()} ` : "";
    speech.start();
  }

  return { supported: speech.supported, listening: speech.listening, toggle };
}
