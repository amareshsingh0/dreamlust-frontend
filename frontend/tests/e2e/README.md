# E2E Testing with Playwright

This directory contains end-to-end (E2E) tests using Playwright to test user flows and interactions across the application.

## Setup

Playwright is already installed. To install browsers:

```bash
bunx playwright install
```

Or install specific browsers:

```bash
bunx playwright install chromium
bunx playwright install firefox
bunx playwright install webkit
```

## Running Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run tests in headed mode (see browser)
bun run test:e2e:headed

# Run tests with UI mode (interactive)
bun run test:e2e:ui

# Debug tests
bun run test:e2e:debug

# Run specific test file
bunx playwright test search-flow.spec.ts

# Run tests in specific browser
bunx playwright test --project=chromium
```

## Test Structure

```
tests/
  e2e/
    search-flow.spec.ts          # Search and filter tests
    signup-watch-flow.spec.ts     # User signup to video watch flow
    README.md                     # This file
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test('test description', async ({ page }) => {
  await page.goto('/');
  // Your test code
});
```

### Best Practices

1. **Use data-testid attributes**
   - Components should have `data-testid` for reliable selectors
   - Example: `data-testid="search-input"`, `data-testid="video-card"`

2. **Wait for elements**
   - Use `page.waitForSelector()` for dynamic content
   - Use `page.waitForLoadState()` for page navigation

3. **Use page locators**
   - Prefer `page.locator('[data-testid="..."]')` over CSS selectors
   - More reliable and maintainable

4. **Handle async operations**
   - Use `await` for all async operations
   - Use `page.waitForTimeout()` sparingly (prefer waiting for specific conditions)

5. **Test user flows**
   - Test complete user journeys, not just individual components
   - Example: Signup → Search → Watch → Like

## Test IDs

The following test IDs are available in the application:

- `search-input` - Search input field
- `search-results` - Search results container
- `video-card` - Content card component
- `video-player` - Video player container
- `like-button` - Like button on video page
- `filter-category-{id}` - Category filter buttons
- `filter-duration-{type}` - Duration filter buttons

## Configuration

Playwright configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:4001` (or set `PLAYWRIGHT_TEST_BASE_URL`)
- **Browsers**: Chromium, Firefox, WebKit
- **Screenshots**: On failure only
- **Traces**: On first retry
- **Web Server**: Automatically starts dev server before tests

## CI/CD

For CI/CD, set the `CI` environment variable:

```bash
CI=true bun run test:e2e
```

This will:
- Run tests with retries
- Generate HTML reports
- Save screenshots and traces on failure

## Debugging

### View Test Report

```bash
bunx playwright show-report
```

### Debug Mode

```bash
bun run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through tests
- Inspect page state
- View console logs
- Take screenshots

### Screenshots and Videos

Screenshots are saved on test failure in `test-results/`.

Videos can be enabled in `playwright.config.ts`:

```typescript
use: {
  video: 'on-first-retry',
}
```

## Common Issues

### Tests timing out

- Increase timeout in test: `test.setTimeout(60000)`
- Check if dev server is running
- Verify test IDs exist in components

### Element not found

- Check if element has `data-testid` attribute
- Wait for element: `await page.waitForSelector('[data-testid="..."]')`
- Check if element is in iframe or shadow DOM

### Flaky tests

- Use `page.waitForLoadState('networkidle')` after navigation
- Wait for specific conditions instead of fixed timeouts
- Use `page.waitForSelector()` with proper options

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)


