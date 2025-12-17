import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { securityHeadersPlugin } from "./vite.config.security-headers";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Exclude Playwright e2e tests - they should only run with Playwright
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/tests/e2e/**', // Exclude Playwright e2e tests
      '**/*.e2e.{ts,tsx}',
      '**/playwright.config.ts',
    ],
    include: [
      '**/*.{test,spec}.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'tests/e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
  server: {
    host: "::",
    port: 4001,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Feature chunks - lazy load heavy components
          'video': ['./src/components/video/VideoPlayer'],
          'comments': ['./src/components/comments/CommentSection'],
          'admin': ['./src/pages/admin/ModerationDashboard'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB
    // Enable minification and source maps
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.log in production
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    securityHeadersPlugin(),
    // Enable gzip compression for production builds
    mode === "production" && viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files > 1KB
    }),
    // Enable brotli compression (better than gzip)
    mode === "production" && viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
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
