# Performance Optimization Guide

Based on Chrome DevTools Performance analysis, here are the identified issues and optimization strategies.

## 🔴 Critical Performance Issues Identified

### 1. **Unattributed Main Thread Time: 1,426 ms**
**Issue:** Significant time spent in unattributed code (likely third-party scripts or unoptimized code)

**Solutions:**
- Code splitting and lazy loading
- Defer non-critical third-party scripts
- Optimize bundle size
- Use Web Workers for heavy computations

### 2. **Large DOM Size**
**Issue:** "Optimize DOM size" suggestion from DevTools

**Solutions:**
- Virtualize long lists (already implemented with `VirtualizedContentGrid`)
- Limit initial content rendering
- Use pagination instead of infinite scroll for very long lists
- Remove hidden/unused DOM elements

### 3. **Third-Party Scripts**
**Issue:** Razorpay checkout frame and other third-party scripts blocking main thread

**Solutions:**
- Load Razorpay script only when needed (on payment page)
- Use `defer` or `async` attributes for third-party scripts
- Implement script loading on demand
- Consider using iframe for third-party widgets

### 4. **Rendering Time: 707 ms**
**Issue:** High rendering time indicates layout thrashing or excessive repaints

**Solutions:**
- Use CSS `will-change` for animated elements
- Optimize CSS selectors
- Reduce forced reflows
- Use `transform` and `opacity` for animations (GPU accelerated)

### 5. **Scripting Time: 661 ms**
**Issue:** JavaScript execution blocking main thread

**Solutions:**
- Code splitting and lazy loading
- Defer non-critical JavaScript
- Use Web Workers for heavy computations
- Optimize React re-renders with `React.memo`, `useMemo`, `useCallback`

## ✅ Already Implemented Optimizations

1. **Code Splitting:**
   - React lazy loading for routes
   - Manual chunks in Vite config
   - Dynamic imports

2. **Image Optimization:**
   - `OptimizedImage` component with lazy loading
   - Blur placeholders
   - Responsive images

3. **Virtualization:**
   - `VirtualizedContentGrid` for long lists
   - `VirtualizedContentList` for list views

4. **Bundle Optimization:**
   - Manual chunk splitting (react-vendor, ui-vendor, etc.)
   - Tree shaking enabled

## 🚀 Recommended Optimizations

### 1. **Lazy Load Third-Party Scripts**

**Razorpay Script:**
```typescript
// Load Razorpay only when needed
const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    document.head.appendChild(script);
  });
};
```

### 2. **Optimize React Re-renders**

**Use React.memo for expensive components:**
```typescript
export const ContentCard = React.memo(({ content, ...props }) => {
  // Component code
});
```

**Use useMemo and useCallback:**
```typescript
const memoizedValue = useMemo(() => expensiveComputation(), [deps]);
const memoizedCallback = useCallback(() => handleClick(), [deps]);
```

### 3. **Reduce Initial Bundle Size**

**Check current bundle size:**
```bash
bun run build
# Check dist/assets/ folder sizes
```

**Optimize imports:**
- Use named imports instead of default imports where possible
- Remove unused dependencies
- Use dynamic imports for heavy libraries

### 4. **Optimize Images**

**Already using OptimizedImage, but ensure:**
- All images have proper `width` and `height` attributes
- Use WebP format where supported
- Implement responsive images with `srcset`

### 5. **Defer Non-Critical CSS**

**Move non-critical CSS to separate file:**
```html
<link rel="preload" href="/critical.css" as="style">
<link rel="stylesheet" href="/critical.css">
<link rel="stylesheet" href="/non-critical.css" media="print" onload="this.media='all'">
```

### 6. **Implement Service Worker for Caching**

**Already have `sw.js`, ensure it's:**
- Caching static assets
- Caching API responses (with appropriate strategy)
- Implementing offline fallbacks

### 7. **Optimize Font Loading**

**Use font-display: swap:**
```css
@font-face {
  font-family: 'Space Grotesk';
  font-display: swap;
  /* ... */
}
```

**Preload critical fonts:**
```html
<link rel="preload" href="/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
```

### 8. **Reduce Main Thread Blocking**

**Use requestIdleCallback for non-critical work:**
```typescript
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Non-critical initialization
  });
}
```

**Debounce/throttle event handlers:**
```typescript
import { debounce, throttle } from 'lodash-es';

const handleScroll = throttle(() => {
  // Scroll handler
}, 100);
```

### 9. **Optimize State Management**

**Avoid unnecessary re-renders:**
- Split large contexts into smaller ones
- Use Zustand or Jotai for better performance (if needed)
- Memoize context values

### 10. **Implement Resource Hints**

**Add to index.html:**
```html
<!-- Preconnect to external domains -->
<link rel="preconnect" href="https://api.razorpay.com">
<link rel="dns-prefetch" href="https://api.razorpay.com">

<!-- Prefetch critical resources -->
<link rel="prefetch" href="/api/content/trending">
```

## 📊 Performance Targets

### Core Web Vitals Goals:
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID/INP (Interaction to Next Paint):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Lighthouse Scores:
- **Performance:** 90+
- **Accessibility:** 95+
- **Best Practices:** 90+
- **SEO:** 90+

## 🔧 Quick Wins

1. **Enable Compression:**
   - Gzip/Brotli compression on server
   - Already configured in Vite build

2. **CDN for Static Assets:**
   - Serve images, fonts, and static files from CDN
   - Configure in `S3_CDN_URL` or `R2_PUBLIC_URL`

3. **Remove Unused Code:**
   ```bash
   # Check for unused exports
   bunx depcheck
   ```

4. **Optimize Bundle:**
   ```bash
   bun run build
   # Analyze bundle with:
   bunx vite-bundle-visualizer
   ```

5. **Minimize Re-renders:**
   - Add React DevTools Profiler
   - Identify components re-rendering unnecessarily
   - Apply React.memo, useMemo, useCallback

## 📝 Monitoring

### Performance Monitoring Tools:
1. **Lighthouse CI** - Automated performance testing
2. **Chrome DevTools Performance** - Manual profiling
3. **Web Vitals** - Real user monitoring
4. **Datadog RUM** - APM and performance tracking (when configured)

### Metrics to Track:
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)

## 🎯 Priority Actions

### High Priority (Do First):
1. ✅ Lazy load Razorpay script
2. ✅ Optimize React re-renders with memoization
3. ✅ Reduce initial bundle size
4. ✅ Implement resource hints

### Medium Priority:
5. Defer non-critical CSS
6. Optimize font loading
7. Implement service worker caching strategy
8. Use Web Workers for heavy computations

### Low Priority:
9. Implement requestIdleCallback for non-critical work
10. Optimize state management structure
11. Add performance monitoring

## 📚 Resources

- [Web.dev Performance](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
