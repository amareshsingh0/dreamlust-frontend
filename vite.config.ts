// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react-swc";
// import path from "path";
// import { securityHeadersPlugin } from "./vite.config.security-headers";
// import viteCompression from "vite-plugin-compression";

// // https://vitejs.dev/config/
// export default defineConfig(({ mode }) => ({
//   test: {
//     globals: true,
//     environment: 'jsdom',
//     setupFiles: ['./src/test/setup.ts'],
//     css: true,
//     // Exclude Playwright e2e tests - they should only run with Playwright
//     exclude: [
//       '**/node_modules/**',
//       '**/dist/**',
//       '**/build/**',
//       '**/.{idea,git,cache,output,temp}/**',
//       '**/tests/e2e/**', // Exclude Playwright e2e tests
//       '**/*.e2e.{ts,tsx}',
//       '**/playwright.config.ts',
//     ],
//     include: [
//       '**/*.{test,spec}.{ts,tsx}',
//       '**/__tests__/**/*.{ts,tsx}',
//     ],
//     coverage: {
//       provider: 'v8',
//       reporter: ['text', 'json', 'html'],
//       exclude: [
//         'node_modules/',
//         'src/test/',
//         'tests/e2e/',
//         '**/*.d.ts',
//         '**/*.config.*',
//         '**/mockData',
//         '**/*.test.{ts,tsx}',
//       ],
//     },
//   },
//   server: {
//     host: "::",
//     port: 4001,
//   },
//   preview: {
//     host: "::",
//     port: 4173,
//     strictPort: true,
//   },
//   build: {
//     outDir: "dist",
//     // CommonJS options to handle circular dependencies
//     commonjsOptions: {
//       include: [/node_modules/],
//       transformMixedEsModules: true,
//     },
//     rollupOptions: {
//       output: {
//         manualChunks: (id) => {
//           // AGGRESSIVE FIX: Put ALL React-dependent libraries in react-vendor chunk
//           // This ensures React is always available and prevents circular dependencies
//           if (id.includes('node_modules')) {
//             // React core libraries - MUST be together
//             if (id.includes('node_modules/react/') || 
//                 id.includes('node_modules/react-dom/') ||
//                 id.includes('node_modules/react/jsx-runtime')) {
//               return 'react-vendor';
//             }
            
//             // ALL React-dependent libraries - put in react-vendor to avoid circular deps
//             // This includes ANY library with 'react' in the path
//             if (id.includes('react') || 
//                 id.includes('@radix-ui') ||
//                 id.includes('react-router') ||
//                 id.includes('@tanstack/react') ||
//                 id.includes('react-hook-form') ||
//                 id.includes('@hookform') ||
//                 id.includes('react-helmet') ||
//                 id.includes('next-themes') ||
//                 id.includes('lucide-react') ||
//                 id.includes('chart.js') ||
//                 id.includes('react-chartjs-2') ||
//                 id.includes('recharts') ||
//                 id.includes('embla-carousel-react') ||
//                 id.includes('react-day-picker') ||
//                 id.includes('react-resizable-panels') ||
//                 id.includes('sonner') ||
//                 id.includes('vaul') ||
//                 id.includes('cmdk') ||
//                 id.includes('input-otp')) {
//               return 'react-vendor';
//             }
            
//             // Form validation - separate chunk (no React dependency)
//             if (id.includes('zod')) {
//               return 'form-vendor';
//             }
            
//             // Sentry - lazy loaded only on errors, separate chunk
//             // This ensures Sentry is never loaded in initial bundle
//             if (id.includes('@sentry') || id.includes('sentry')) {
//               return 'sentry';
//             }
            
//             // Heavy non-React libs - separate chunk
//             // Only put truly non-React libraries here
//             if (id.includes('@aws-sdk') || 
//                 id.includes('axios') || 
//                 id.includes('date-fns') ||
//                 id.includes('socket.io-client') ||
//                 id.includes('ws')) {
//               return 'vendor-other';
//             }
            
//             // If unsure, put in react-vendor to be safe (prevents circular deps)
//             // Most modern UI libraries depend on React anyway
//             return 'react-vendor';
//           }
//           // Split app code by feature
//           if (id.includes('/src/components/feedback/')) {
//             return 'feedback';
//           }
//           if (id.includes('/src/components/video/')) {
//             return 'video';
//           }
//           if (id.includes('/src/components/comments/')) {
//             return 'comments';
//           }
//           if (id.includes('/src/pages/admin/')) {
//             return 'admin';
//           }
//           // Keep main app code together
//           return null;
//         },
//       },
//     },
//     chunkSizeWarningLimit: 1000, // 1MB
//     // Enable minification and source maps
//     minify: 'esbuild',
//     // Optimize chunk loading
//     target: 'esnext',
//     cssCodeSplit: true, // Split CSS into separate files
//     // Generate source maps in production for debugging (hidden source maps)
//     // Lighthouse best practices requires source maps for large JS files
//     sourcemap: mode === 'production' ? 'hidden' : true,
//     // Remove console.log in production (best practices)
//     esbuild: {
//       drop: mode === 'production' ? ['console', 'debugger'] : [],
//     },
//   },
//   plugins: [
//     react(),
//     securityHeadersPlugin(),
//     // Enable gzip compression for production builds
//     mode === "production" && viteCompression({
//       algorithm: 'gzip',
//       ext: '.gz',
//       threshold: 1024, // Only compress files > 1KB
//     }),
//     // Enable brotli compression (better than gzip)
//     mode === "production" && viteCompression({
//       algorithm: 'brotliCompress',
//       ext: '.br',
//       threshold: 1024,
//     }),
//   ].filter(Boolean),
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//       // Ensure React is resolved consistently across all chunks
//       'react': path.resolve(__dirname, './node_modules/react'),
//       'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
//     },
//   },
//   // Optimize dependencies
//   optimizeDeps: {
//     include: [
//       'react',
//       'react-dom',
//       'react/jsx-runtime',
//       'react-router-dom',
//     ],
//     exclude: ['@sentry/react'], // Exclude Sentry from pre-bundling (lazy loaded)
//     // Force React to be pre-bundled together
//     esbuildOptions: {
//       target: 'esnext',
//     },
//   },
//   // Expose environment variables to client
//   // Only VITE_* variables are exposed to frontend
//   // DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY are NOT exposed (backend only)
//   envPrefix: 'VITE_',
// }));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { securityHeadersPlugin } from "./vite.config.security-headers";
import viteCompression from "vite-plugin-compression";

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/tests/e2e/**",
      "**/*.e2e.{ts,tsx}",
      "**/playwright.config.ts"
    ],
    include: [
      "**/*.{test,spec}.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "tests/e2e/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "**/*.test.{ts,tsx}"
      ]
    }
  },

  server: {
    host: "localhost",
    port: 4001
  },

  preview: {
    host: "localhost",
    port: 3000,
    strictPort: true
  },

  build: {
    outDir: "dist",
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === "production" ? "hidden" : true,

    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },

    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (
              id.includes("react/") ||
              id.includes("react-dom/") ||
              id.includes("react/jsx-runtime")
            ) {
              return "react-vendor";
            }

            if (
              id.includes("react") ||
              id.includes("@radix-ui") ||
              id.includes("react-router") ||
              id.includes("@tanstack/react") ||
              id.includes("react-hook-form") ||
              id.includes("@hookform") ||
              id.includes("react-helmet") ||
              id.includes("next-themes") ||
              id.includes("lucide-react") ||
              id.includes("chart.js") ||
              id.includes("react-chartjs-2") ||
              id.includes("recharts") ||
              id.includes("embla-carousel-react") ||
              id.includes("react-day-picker") ||
              id.includes("react-resizable-panels") ||
              id.includes("sonner") ||
              id.includes("vaul") ||
              id.includes("cmdk") ||
              id.includes("input-otp")
            ) {
              return "react-vendor";
            }

            if (id.includes("zod")) return "form-vendor";
            if (id.includes("@sentry")) return "sentry";

            if (
              id.includes("@aws-sdk") ||
              id.includes("axios") ||
              id.includes("date-fns") ||
              id.includes("socket.io-client") ||
              id.includes("ws")
            ) {
              return "vendor-other";
            }

            return "react-vendor";
          }

          if (id.includes("/src/components/feedback/")) return "feedback";
          if (id.includes("/src/components/video/")) return "video";
          if (id.includes("/src/components/comments/")) return "comments";
          if (id.includes("/src/pages/admin/")) return "admin";

          return null;
        }
      }
    },

    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : []
    }
  },

  plugins: [
    react(),
    securityHeadersPlugin(),

    mode === "production" &&
      viteCompression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 1024
      }),

    mode === "production" &&
      viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 1024
      })
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom")
    }
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react-router-dom"],
    exclude: ["@sentry/react"],
    esbuildOptions: {
      target: "esnext"
    }
  },

  envPrefix: "VITE_"
}));
