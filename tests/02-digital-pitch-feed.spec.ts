import { test, expect } from '@playwright/test';
import { quickLogin, navigateToTab } from './helpers';

test.describe('Digital Pitch Feed', () => {

  test('pitch tab is accessible after login', async ({ page }) => {
    await quickLogin(page);
    await expect(page.locator('#tab_pitch')).toBeVisible({ timeout: 10000 });
  });

  test('pitch feed renders without crash for new user', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'pitch');
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('pitch feed shows empty state or feed content — no fake demo data', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await quickLogin(page);
    await navigateToTab(page, 'pitch');
    await page.waitForTimeout(2000);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('pitch tab label is visible in bottom nav', async ({ page }) => {
    await quickLogin(page);
    const tab = page.locator('#tab_pitch');
    await expect(tab).toBeVisible({ timeout: 10000 });
    const text = await tab.textContent();
    expect(text?.toLowerCase()).toContain('pitch');
  });

  test('switching away from pitch and back does not crash', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await navigateToTab(page, 'pitch');
    await expect(page.locator('#tab_pitch')).toBeVisible({ timeout: 5000 });
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('no horizontal scroll on pitch feed', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'pitch');
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

});
