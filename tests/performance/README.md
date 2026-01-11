# Performance Audits with Lighthouse CI

This project uses [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) to automatically audit performance, accessibility, best practices, and SEO on every pull request and push.

## Overview

Lighthouse CI runs Lighthouse audits on key pages and enforces performance budgets to ensure the application maintains high quality standards.

## Configuration

The Lighthouse CI configuration is in `lighthouserc.js` (or `lighthouserc.json`) at the root of the frontend directory. Both formats are supported, but `lighthouserc.js` takes precedence if both exist.

### Pages Audited

- Homepage (`/`)
- Search page (`/search`)
- Watch page (`/watch/1`) - Sample content ID

### Performance Budgets

The following budgets are enforced:

**Category Scores:**
- Performance: ≥ 90% (error threshold)
- Accessibility: ≥ 95% (error threshold)
- Best Practices: ≥ 90% (error threshold)
- SEO: ≥ 90% (error threshold)
- PWA: ≥ 50% (warning only)

**Performance Metrics (Error Thresholds):**
- First Contentful Paint: < 2s (error)
- Time to Interactive: < 3.5s (error)
- Total Byte Weight: < 1MB (error)

**Performance Metrics (Warning Thresholds):**
- Largest Contentful Paint: < 2.5s
- Total Blocking Time: < 300ms
- Cumulative Layout Shift: < 0.1
- Speed Index: < 3s

**Resource Budgets:**
- Total Page Weight: < 1MB (error threshold)
- JavaScript: < 500KB (warning)
- CSS: < 200KB (warning)
- Images: < 1MB (warning)

## Running Locally

### Prerequisites

Install Lighthouse CI globally:

```bash
npm install -g @lhci/cli
```

### Run Lighthouse Audit

1. Build the application:

```bash
cd frontend
bun run build
```

2. Start the preview server:

```bash
bun run preview
```

3. In another terminal, run Lighthouse CI:

```bash
cd frontend
bun run lighthouse:local
```

Or use the automated script:

```bash
bun run lighthouse:ci
```

## CI/CD Integration

Lighthouse CI runs automatically on:
- Pull requests to `main`, `master`, or `develop`
- Pushes to `main`, `master`, or `develop`
- Manual workflow dispatch

### GitHub Actions

The workflow is defined in `.github/workflows/lighthouse.yml`.

### Viewing Results

1. **GitHub Checks**: Results appear as checks on pull requests
2. **Artifacts**: Lighthouse reports are uploaded as artifacts
3. **Lighthouse CI Server** (optional): Set up a Lighthouse CI server for historical tracking

## Setting Up Lighthouse CI Server (Optional)

For historical tracking and better reporting:

1. Deploy a Lighthouse CI server (or use a hosted service)
2. Add secrets to GitHub:
   - `LHCI_SERVER_BASE_URL`: Your Lighthouse CI server URL
   - `LHCI_SERVER_TOKEN`: Your server authentication token
3. Update `lighthouserc.js` to use the server:

```javascript
upload: {
  target: 'lhci',
  serverBaseUrl: process.env.LHCI_SERVER_BASE_URL,
  token: process.env.LHCI_SERVER_TOKEN,
}
```

## Interpreting Results

### Performance Score

- **90-100**: Excellent
- **80-89**: Good
- **50-79**: Needs improvement
- **0-49**: Poor

### Key Metrics

- **First Contentful Paint (FCP)**: Time to first content render
- **Largest Contentful Paint (LCP)**: Time to largest content render
- **Total Blocking Time (TBT)**: Time the main thread is blocked
- **Cumulative Layout Shift (CLS)**: Visual stability measure
- **Speed Index**: How quickly content is visually displayed

## Improving Performance

### Common Optimizations

1. **Code Splitting**: Lazy load routes and components
2. **Image Optimization**: Use WebP, lazy loading, responsive images
3. **Bundle Size**: Analyze and reduce JavaScript/CSS bundle sizes
4. **Caching**: Implement proper caching strategies
5. **CDN**: Use CDN for static assets
6. **Compression**: Enable gzip/brotli compression

### Tools

- **Bundle Analyzer**: `bun run build --analyze` (if configured)
- **Lighthouse DevTools**: Run audits in Chrome DevTools
- **WebPageTest**: For detailed performance analysis

## Troubleshooting

### Tests Failing

1. **Check build output**: Ensure the build completes successfully
2. **Verify preview server**: The preview server must be running
3. **Check thresholds**: Adjust budgets in `lighthouserc.js` if needed
4. **Review artifacts**: Download and review Lighthouse reports

### Local Issues

1. **Port conflicts**: Ensure port 4173 (preview) is available
2. **Build errors**: Fix any build errors before running Lighthouse
3. **Timeout**: Increase `startServerReadyTimeout` if server takes longer to start

## Resources

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Lighthouse Scoring Guide](https://web.dev/performance-scoring/)
- [Web Vitals](https://web.dev/vitals/)
- [Performance Budgets](https://web.dev/performance-budgets-101/)

