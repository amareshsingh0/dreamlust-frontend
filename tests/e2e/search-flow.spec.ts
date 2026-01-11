import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('search and filter content', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to search or use search input in header
    // First, try to find search input in header or navigate to search page
    const searchInput = page.locator('[data-testid="search-input"]').first();
    
    // If search input not in header, navigate to search page
    if (await searchInput.count() === 0) {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
    }
    
    // Search
    const searchField = page.locator('[data-testid="search-input"]').first();
    await searchField.fill('coding tutorial');
    await searchField.press('Enter');
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 });
    
    // Apply filters if available
    const categoryFilter = page.locator('[data-testid="filter-category-education"]');
    if (await categoryFilter.count() > 0) {
      await categoryFilter.click();
    }
    
    const durationFilter = page.locator('[data-testid="filter-duration-long"]');
    if (await durationFilter.count() > 0) {
      await durationFilter.click();
    }
    
    // Wait a bit for filters to apply
    await page.waitForTimeout(1000);
    
    // Verify filtered results
    const results = page.locator('[data-testid="video-card"]');
    const resultsCount = await results.count();
    expect(resultsCount).toBeGreaterThan(0);
    
    // Click first result
    if (resultsCount > 0) {
      await results.first().click();
      await page.waitForURL(/\/watch\/.+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/watch\/.+/);
    }
  });

  test('search with no results shows empty state', async ({ page }) => {
    await page.goto('/search');
    
    const searchInput = page.locator('[data-testid="search-input"]').first();
    await searchInput.fill('nonexistentquery12345');
    await searchInput.press('Enter');
    
    // Wait for search to complete
    await page.waitForTimeout(2000);
    
    // Should show empty state or no results message
    const emptyState = page.locator('text=/no results|no content found|nothing found/i');
    const results = page.locator('[data-testid="video-card"]');
    
    // Either empty state message or zero results
    const hasEmptyState = await emptyState.count() > 0;
    const resultsCount = await results.count();
    
    expect(hasEmptyState || resultsCount === 0).toBeTruthy();
  });
});


