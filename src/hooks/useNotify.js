import { useCallback } from "react";

const supported = typeof window !== "undefined" && "Notification" in window;

// Wraps the browser Notification API. Falls back silently (caller should
// show an in-app banner regardless) if unsupported, denied, or blocked —
// this is a bonus alert, never the only signal.
export function useNotify() {
  const requestPermission = useCallback(async () => {
    if (!supported) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }, []);

  const notify = useCallback((title, options) => {
    if (!supported || Notification.permission !== "granted") return false;
    try {
      new Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { supported, requestPermission, notify };
}
