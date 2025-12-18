# Lighthouse Setup Guide

## Overview
Lighthouse CI is configured to test performance, accessibility, best practices, and SEO on key pages.

## Configuration
Configuration file: `.lighthouserc.json`

### Test URLs
- `/` - Homepage
- `/search` - Search page
- `/explore` - Explore page
- `/trending` - Trending page

### Performance Targets
- **Performance:** ≥ 90%
- **Accessibility:** ≥ 95%
- **Best Practices:** ≥ 90%
- **SEO:** ≥ 90%

### Core Web Vitals
- **First Contentful Paint:** < 2000ms
- **Largest Contentful Paint:** < 2500ms
- **Time to Interactive:** < 3500ms
- **Total Blocking Time:** < 300ms
- **Cumulative Layout Shift:** < 0.1
- **Speed Index:** < 3000ms
- **Total Byte Weight:** < 1MB

## Running Lighthouse Tests

### Local Testing
```bash
cd frontend
bun run lighthouse
```

This will:
1. Build the frontend (`bun run build`)
2. Start preview server (`bun run preview`)
3. Run Lighthouse on all configured URLs
4. Check assertions against targets

### CI/CD Integration
```bash
bun run lighthouse:ci
```

### Manual Testing
```bash
# Build first
bun run build

# Then run Lighthouse
bun run lighthouse:local
```

## Interpreting Results

### Performance Score
- **90-100:** Excellent ✅
- **75-89:** Good ⚠️
- **50-74:** Needs Improvement ❌
- **0-49:** Poor ❌

### Common Issues and Fixes

#### Low Performance Score
1. **Large bundle size:**
   - Check bundle analysis
   - Remove unused dependencies
   - Implement code splitting

2. **Slow images:**
   - Optimize images (WebP/AVIF)
   - Implement lazy loading
   - Use CDN for images

3. **Blocking resources:**
   - Defer non-critical CSS/JS
   - Use async/defer attributes
   - Preload critical resources

#### Low Accessibility Score
1. **Missing alt text:**
   - Add alt attributes to all images
   - Use descriptive alt text

2. **Color contrast:**
   - Ensure WCAG AA compliance
   - Test with contrast checker

3. **Keyboard navigation:**
   - Test with keyboard only
   - Ensure focus indicators visible

#### Low SEO Score
1. **Missing meta tags:**
   - Add title, description
   - Add Open Graph tags
   - Add structured data

2. **Missing headings:**
   - Use proper heading hierarchy (h1-h6)
   - One h1 per page

## Continuous Monitoring

### GitHub Actions (Optional)
Add to `.github/workflows/lighthouse.yml`:
```yaml
name: Lighthouse CI
on: [push, pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

## Best Practices

1. **Run before deployment:**
   - Always test before production
   - Fix issues before merging

2. **Monitor trends:**
   - Track scores over time
   - Set up alerts for regressions

3. **Test on real devices:**
   - Desktop and mobile
   - Different network conditions

4. **Optimize incrementally:**
   - Focus on biggest wins first
   - Measure impact of changes

## Current Status

✅ Lighthouse CI configured
✅ Performance targets set (≥90%)
✅ Core Web Vitals configured
✅ Test URLs configured
✅ Build scripts ready

## Next Steps

1. Run initial baseline: `bun run lighthouse`
2. Fix any issues found
3. Set up CI/CD integration
4. Monitor performance over time

