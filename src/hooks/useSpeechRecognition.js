import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionImpl =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export function useSpeechRecognition() {
  const supported = Boolean(SpeechRecognitionImpl);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const finalRef = useRef("");

  useEffect(() => {
    if (!supported) return;
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += chunk + " ";
        else interim += chunk;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      setError(event.error);
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    finalRef.current = "";
    setTranscript("");
    setError(null);
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already started; ignore
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const setManualTranscript = useCallback((text) => {
    finalRef.current = text;
    setTranscript(text);
  }, []);

  return { supported, listening, transcript, error, start, stop, setManualTranscript };
}
