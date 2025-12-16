import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/monitoring/sentry";
import { initDatadogRUM, initDatadogLogs } from "./lib/monitoring/datadog";
import App from "./App.tsx";
import "./index.css";

// Initialize monitoring tools in production
if (import.meta.env.PROD) {
  initSentry();
  initDatadogRUM();
  initDatadogLogs();
}

createRoot(document.getElementById("root")!).render(<App />);
