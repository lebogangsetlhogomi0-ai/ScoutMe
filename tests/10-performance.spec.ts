import { test, expect } from '@playwright/test';
import { quickLogin } from './helpers';

test.describe('Performance & Stability', () => {

  test('splash page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 5000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('page title is set correctly', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/scoutme|football|scout/);
  });

  test('no fatal JS errors on splash load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 10000 });
    await page.waitForTimeout(1000);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('no fatal JS errors after logging in', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await quickLogin(page);
    await page.waitForTimeout(2000);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('rapid tab switching does not crash', async ({ page }) => {
    await quickLogin(page);
    const tabs = ['pitch', 'discover', 'pitch', 'discover', 'pitch'];
    for (const tab of tabs) {
      const el = page.locator(`#tab_${tab}`);
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(250);
      }
    }
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('rapid scrolling does not crash', async ({ page }) => {
    await quickLogin(page);
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(50);
    }
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('manifest.json is accessible (PWA)', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text?.toLowerCase()).toMatch(/scoutme|name/);
  });

  test('body has content — app did not white-screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(30);
  });

});
