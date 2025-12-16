module.exports = {
  ci: {
    collect: {
      // Start a local server to test against
      startServerCommand: 'bun run start',
      startServerReadyPattern: 'Local:|ready in|vite preview|http://localhost',
      startServerReadyTimeout: 60000,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/search',
        'http://localhost:3000/watch/1', // Using sample content ID from mockData
      ],
      numberOfRuns: 3, // Run 3 times and take median
    },
    assert: {
      // Performance budgets - Stricter requirements
      assertions: {
        // Category scores
        'categories:performance': ['error', { minScore: 0.9 }], // 90% minimum
        'categories:accessibility': ['error', { minScore: 0.95 }], // 95% minimum
        'categories:best-practices': ['error', { minScore: 0.9 }], // 90% minimum
        'categories:seo': ['error', { minScore: 0.9 }], // 90% minimum
        'categories:pwa': ['warn', { minScore: 0.5 }], // 50% minimum (warn only)
        
        // Performance metrics - Critical
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2s (error threshold)
        'interactive': ['error', { maxNumericValue: 3500 }], // 3.5s (Time to Interactive)
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }], // 2.5s
        'total-blocking-time': ['warn', { maxNumericValue: 300 }], // 300ms
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }], // 0.1
        'speed-index': ['warn', { maxNumericValue: 3000 }], // 3s
        
        // Resource budgets - Critical
        'total-byte-weight': ['error', { maxNumericValue: 1000000 }], // 1MB total page weight
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 200000 }], // 200KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000000 }], // 1MB
      },
    },
    upload: {
      target: 'temporary-public-storage', // Upload to temporary public storage
      // Or use Lighthouse CI server:
      // target: 'lhci',
      // serverBaseUrl: process.env.LHCI_SERVER_BASE_URL,
      // token: process.env.LHCI_SERVER_TOKEN,
    },
  },
};

