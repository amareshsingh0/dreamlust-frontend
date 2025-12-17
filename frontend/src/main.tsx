import { createRoot } from "react-dom/client";
// Lazy load Sentry - only initialize on errors to reduce initial bundle size
// This saves ~870 KiB on initial load
import App from "./App.tsx";
import "./index.css";

// Lazy load Sentry only when needed (on errors) - reduces initial bundle by ~870 KiB
if (import.meta.env.PROD) {
  // Initialize Sentry asynchronously after page load to avoid blocking
  import("./lib/monitoring/sentry").then(({ initSentry }) => {
    initSentry();
  }).catch(() => {
    // Silently fail if Sentry can't be loaded
    console.warn('Failed to load Sentry');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
