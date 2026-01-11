import { createRoot } from "react-dom/client";
// Lazy load Sentry - only initialize on errors to reduce initial bundle size
// This saves ~870 KiB on initial load
import App from "./App";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import "./index.css";

// Console logging only in development (removed in production for best practices)
if (import.meta.env.DEV) {
  console.log('🚀 Main.tsx loaded');
  console.log('🔍 Environment:', import.meta.env.MODE);
  console.log('🔍 Root element check:', document.getElementById('root') ? 'Found' : 'NOT FOUND');
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log('Service Worker registered:', registration);
        }
      })
      .catch((error) => {
        // Only log in dev, silent in production for best practices
        if (import.meta.env.DEV) {
          console.warn('Service Worker registration failed:', error);
        }
      });
  });
}

// Lazy load Sentry only on actual errors - reduces initial bundle by ~870 KiB
// Don't load Sentry at all on initial page load - only load when an error occurs
if (import.meta.env.PROD) {
  // Set up error handler that loads Sentry only when needed
  const originalErrorHandler = window.onerror;
  const originalUnhandledRejection = window.onunhandledrejection;
  
  window.onerror = function(...args) {
    // Load Sentry only when an error actually occurs
    import("./lib/monitoring/sentry").then(({ initSentry }) => {
      initSentry();
      // Re-trigger error after Sentry is initialized
      if (originalErrorHandler) originalErrorHandler.apply(window, args);
    }).catch(() => {
      // Silently fail if Sentry can't be loaded
    });
    return false;
  };
  
  window.onunhandledrejection = function(event) {
    // Load Sentry only when a promise rejection occurs
    import("./lib/monitoring/sentry").then(({ initSentry }) => {
      initSentry();
      if (originalUnhandledRejection) originalUnhandledRejection.call(window, event);
    }).catch(() => {
      // Silently fail if Sentry can't be loaded
    });
  };
}

// Add error handling for root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  if (import.meta.env.DEV) {
    console.error("❌ Root element not found!");
  }
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial; background: #ff0000; color: white;">
      <h1>Error: Root element not found</h1>
      <p>Make sure index.html has &lt;div id="root"&gt;&lt;/div&gt;</p>
    </div>
  `;
  throw new Error("Root element not found. Make sure index.html has <div id='root'></div>");
}

if (import.meta.env.DEV) {
  console.log('✅ Root element found, rendering app...');
}

// Add global error handler for uncaught errors (only log in dev)
window.addEventListener('error', (event) => {
  if (import.meta.env.DEV) {
    console.error('❌ Global error:', event.error);
    console.error('❌ Error message:', event.message);
    console.error('❌ Error source:', event.filename, ':', event.lineno);
  }
  // In production, send to error tracking service silently
});

window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) {
    console.error('❌ Unhandled promise rejection:', event.reason);
  }
  // In production, send to error tracking service silently
});

try {
  if (import.meta.env.DEV) {
    console.log('🎨 Creating React root...');
  }
  const root = createRoot(rootElement);
  if (import.meta.env.DEV) {
    console.log('🎨 Rendering App component...');
  }
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  if (import.meta.env.DEV) {
    console.log('✅ App rendered successfully!');
  }
} catch (error) {
  if (import.meta.env.DEV) {
    console.error('❌ Failed to render app:', error);
  }
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial; background: #ff0000; color: white;">
      <h1>Error: Failed to render app</h1>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>Check browser console for details.</p>
    </div>
  `;
}
