import { MicIcon } from "../icons";

// Small inline dictation toggle for a single text field. Renders nothing if
// the browser doesn't support speech recognition (caller just gets a
// plain input with no mic — consistent with the voice-planner fallback).
export default function MicToggleButton({ supported, listening, onClick, className = "", size = "h-9 w-9" }) {
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? "Stop dictation" : "Dictate"}
      className={`grid shrink-0 place-items-center rounded-full transition-colors ${size} ${
        listening ? "bg-red text-white" : "border border-sage/30 bg-base text-ink"
      } ${className}`}
    >
      <MicIcon className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
    </button>
  );
}
