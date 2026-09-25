import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"];

// Locks the journal after `timeoutMs` of inactivity, or immediately when the
// tab/app is backgrounded. `active` should be true only while the journal
// section is mounted AND unlocked — this hook never unlocks anything, it
// only calls `onLock` at the right times.
export function useJournalAutoLock(active, onLock, timeoutMs) {
  const timerRef = useRef(null);
  const onLockRef = useRef(onLock);

  useEffect(() => {
    onLockRef.current = onLock;
  }, [onLock]);

  useEffect(() => {
    if (!active) return;

    function reset() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onLockRef.current(), timeoutMs);
    }
    function handleVisibility() {
      if (document.hidden) onLockRef.current();
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset));
    document.addEventListener("visibilitychange", handleVisibility);
    reset();

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [active, timeoutMs]);
}
