import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "missy-theme"; // "light" | "dark"
const THEME_COLOR = { light: "#eeebe3", dark: "#171e19" };

function applyTheme(value) {
  if (value === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[value]);
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  // Idempotent — keeps the DOM in sync even if another tab/component changed it.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((value) => {
    setThemeState(value);
    applyTheme(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage unavailable (private mode, etc.) — theme still applies for this session.
    }
  }, []);

  return { theme, setTheme };
}
