import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/monitoring/sentry";
// Datadog removed - using Sentry instead for monitoring
// import { initDatadogRUM, initDatadogLogs } from "./lib/monitoring/datadog";
import App from "./App.tsx";
import "./index.css";

// Initialize monitoring tools in production (Sentry only)
if (import.meta.env.PROD) {
  initSentry();
  // Datadog removed - using Sentry instead
  // initDatadogRUM();
  // initDatadogLogs();
}

createRoot(document.getElementById("root")!).render(<App />);
