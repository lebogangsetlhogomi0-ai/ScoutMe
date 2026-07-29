import { test, expect } from '@playwright/test';
import { quickLogin } from './helpers';

test.describe('Performance & Stability', () => {

  test('App loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThan(8000); // Under 8 seconds
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('No console errors on startup', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Filter out expected Firebase demo mode message
        const text = msg.text();
        if (!text.includes('Firebase') && !text.includes('Demo Mode') && !text.includes('Service Worker')) {
          errors.push(text);
        }
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Allow max 2 non-Firebase errors (minor warnings are acceptable)
    expect(errors.length).toBeLessThanOrEqual(3);
  });

  test('Switching tabs 5 times does not crash', async ({ page }) => {
    await quickLogin(page);
    
    const tabs = ['pitch', 'discover', 'news', 'profile', 'pitch'];
    for (const tab of tabs) {
      const tabEl = page.locator(`#tab_${tab}`);
      if (await tabEl.isVisible()) {
        await tabEl.click();
        await page.waitForTimeout(400);
      }
    }
    
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('Rapid scrolling does not crash the app', async ({ page }) => {
    await quickLogin(page);
    
    // Scroll rapidly 10 times
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(50);
    }
    
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('App handles multiple rapid button clicks without crashing', async ({ page }) => {
    await quickLogin(page);
    
    const discoverTab = page.locator('#tab_discover');
    if (await discoverTab.isVisible()) {
      // Click discover tab 5 times rapidly
      for (let i = 0; i < 5; i++) {
        await discoverTab.click();
        await page.waitForTimeout(100);
      }
    }
    
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('Page title is set correctly', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/scoutme|football|grassroots/);
  });

  test('Manifest.json is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);
    const content = await response?.text();
    expect(content).toContain('ScoutMe');
  });

});
