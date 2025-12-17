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
        manualChunks: (id) => {
          // Split node_modules into smaller chunks
          if (id.includes('node_modules')) {
            // React core - critical, load first
            if (id.includes('react') && !id.includes('react-dom')) {
              return 'react-core';
            }
            if (id.includes('react-dom')) {
              return 'react-dom';
            }
            // React Router - critical for routing
            if (id.includes('react-router')) {
              return 'react-router';
            }
            // TanStack Query - used for data fetching
            if (id.includes('@tanstack')) {
              return 'tanstack-query';
            }
            // Radix UI components - split by usage
            if (id.includes('@radix-ui')) {
              if (id.includes('dialog') || id.includes('dropdown') || id.includes('select')) {
                return 'radix-ui-core';
              }
              return 'radix-ui-other';
            }
            // Lucide React - large icon library, tree-shake unused icons
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'form-vendor';
            }
            // Sentry - lazy loaded, separate chunk
            if (id.includes('@sentry')) {
              return 'sentry';
            }
            // Other vendor libraries
            return 'vendor-other';
          }
          // Split app code by feature
          if (id.includes('/src/components/feedback/')) {
            return 'feedback';
          }
          if (id.includes('/src/components/video/')) {
            return 'video';
          }
          if (id.includes('/src/components/comments/')) {
            return 'comments';
          }
          if (id.includes('/src/pages/admin/')) {
            return 'admin';
          }
          // Keep main app code together
          return null;
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB
    // Enable minification and source maps
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.log in production
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
        passes: 2, // Multiple passes for better minification
      },
      mangle: {
        safari10: true, // Fix Safari 10 issues
      },
    },
    // Optimize chunk loading
    target: 'esnext',
    cssCodeSplit: true, // Split CSS into separate files
    sourcemap: mode === 'development', // Only generate sourcemaps in dev
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
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    exclude: ['@sentry/react'], // Exclude Sentry from pre-bundling (lazy loaded)
  },
  // Expose environment variables to client
  // Only VITE_* variables are exposed to frontend
  // DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY are NOT exposed (backend only)
  envPrefix: 'VITE_',
}));
