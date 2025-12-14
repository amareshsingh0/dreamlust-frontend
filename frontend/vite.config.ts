import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { securityHeadersPlugin } from "./vite.config.security-headers";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 4000,
  },
  build: {
    outDir: "dist",
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    securityHeadersPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Expose environment variables to client
  // Only VITE_* variables are exposed to frontend
  // DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY are NOT exposed (backend only)
  envPrefix: 'VITE_',
}));
