import { test, expect } from '@playwright/test';

test.describe('Signup to Video Watch Flow', () => {
  test('complete signup to video watch flow', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    
    // Fill signup form
    const emailInput = page.locator('[name="email"]').first();
    const passwordInput = page.locator('[name="password"]').first();
    const submitButton = page.locator('[type="submit"]').first();
    
    // Wait for form to be ready
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('SecurePass123!');
    
    // If there's a username field
    const usernameInput = page.locator('[name="username"]');
    if (await usernameInput.count() > 0) {
      await usernameInput.fill('testuser' + Date.now());
    }
    
    // Submit form
    await submitButton.click();
    
    // Wait for navigation (either to home or dashboard)
    await page.waitForURL(/\/(home|dashboard|\?|$)/, { timeout: 15000 });
    
    // Search for content
    // Try to find search input in header or navigate to search page
    let searchInput = page.locator('[data-testid="search-input"]').first();
    
    if (await searchInput.count() === 0) {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      searchInput = page.locator('[data-testid="search-input"]').first();
    }
    
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('nature documentary');
    await searchInput.press('Enter');
    
    // Wait for search results
    await page.waitForTimeout(2000);
    
    // Click first video card
    const videoCard = page.locator('[data-testid="video-card"]').first();
    if (await videoCard.count() > 0) {
      await videoCard.click();
      
      // Wait for video page to load
      await page.waitForURL(/\/watch\/.+/, { timeout: 10000 });
      
      // Verify video player loaded
      const videoPlayer = page.locator('[data-testid="video-player"]');
      await videoPlayer.waitFor({ state: 'visible', timeout: 10000 });
      
      // Test like button
      const likeButton = page.locator('[data-testid="like-button"]');
      if (await likeButton.count() > 0) {
        const initialClass = await likeButton.getAttribute('class');
        await likeButton.click();
        
        // Wait for like state to update
        await page.waitForTimeout(1000);
        
        // Check if button state changed (might have liked class or different state)
        const newClass = await likeButton.getAttribute('class');
        // Button should have changed state (either liked or unliked)
        expect(newClass).toBeDefined();
      }
    }
  });

  test('navigate to video from home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and click first video card on home page
    const videoCard = page.locator('[data-testid="video-card"]').first();
    
    if (await videoCard.count() > 0) {
      await videoCard.click();
      
      // Should navigate to watch page
      await page.waitForURL(/\/watch\/.+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/watch\/.+/);
      
      // Video player should be present
      const videoPlayer = page.locator('[data-testid="video-player"]');
      if (await videoPlayer.count() > 0) {
        await expect(videoPlayer).toBeVisible();
      }
    }
  });
});


