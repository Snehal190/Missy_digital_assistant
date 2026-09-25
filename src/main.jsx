import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Presents reminder notifications so tapping one reopens the app on the
// right task even if this tab is backgrounded — see public/sw.js. Registers
// immediately if the page has already finished loading (a deferred module
// script can run after `load` already fired), otherwise waits for it.
if ("serviceWorker" in navigator) {
  const registerSW = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
  if (document.readyState === "complete") registerSW();
  else window.addEventListener("load", registerSW);
}
