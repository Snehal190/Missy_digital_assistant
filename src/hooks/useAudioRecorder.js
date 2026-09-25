import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_RECORDING_SECONDS = 180;

const CANDIDATE_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ""; // let the browser pick its own default
}

// Records microphone audio via MediaRecorder (no live transcript — that's
// the point, transcription now happens server-side). Exposes a 0-1 input
// level for a simple animated meter, an elapsed-seconds counter, and
// auto-stops at MAX_RECORDING_SECONDS.
export function useAudioRecorder() {
  const supported =
    typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const mimeTypeRef = useRef("");
  const stopRef = useRef(() => {});

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(async () => {
    if (!supported) {
      setError("not-supported");
      return;
    }
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
    setElapsed(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType || "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeTypeRef.current || "audio/webm" });
        setAudioBlob(blob);
        cleanupStream();
        setRecording(false);
      };

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setLevel(Math.min(1, avg / 128));
        rafRef.current = requestAnimationFrame(tick);
      }
      tick();

      recorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) stopRef.current();
          return next;
        });
      }, 1000);
    } catch (err) {
      setError(err.name === "NotAllowedError" ? "permission-denied" : "unknown");
      cleanupStream();
    }
  }, [supported, cleanupStream]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setElapsed(0);
    setError(null);
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  return {
    supported,
    recording,
    elapsed,
    level,
    audioBlob,
    error,
    maxDuration: MAX_RECORDING_SECONDS,
    start,
    stop,
    reset,
  };
}
