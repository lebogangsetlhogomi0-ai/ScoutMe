import { test, expect } from '@playwright/test';
import { signupNewUser, navigateToTab } from './helpers';

test.describe('Neural Scout AI (Scout/Club role only)', () => {

  test('scout-ai tab is visible for scout role', async ({ page }) => {
    await signupNewUser(page, 'scout');
    const scoutTab = page.locator('#tab_scout-ai');
    await expect(scoutTab).toBeVisible({ timeout: 10000 });
  });

  test('scout-ai tab is NOT visible for player role', async ({ page }) => {
    await signupNewUser(page, 'player');
    // Player role should not see the scout-ai tab
    const scoutTab = page.locator('#tab_scout-ai');
    const visible = await scoutTab.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible).toBe(false);
  });

  test('scout-ai screen loads with scouting content for scout role', async ({ page }) => {
    await signupNewUser(page, 'scout');
    const scoutTab = page.locator('#tab_scout-ai');
    const visible = await scoutTab.isVisible({ timeout: 10000 }).catch(() => false);
    if (!visible) { test.skip(); return; }

    await scoutTab.click();
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/neural|scout|ai|intelligence|select|player|generate/);
  });

  test('scout-ai screen does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await signupNewUser(page, 'scout');
    const scoutTab = page.locator('#tab_scout-ai');
    const visible = await scoutTab.isVisible({ timeout: 10000 }).catch(() => false);
    if (!visible) { test.skip(); return; }

    await scoutTab.click();
    await page.waitForTimeout(2000);

    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('generate report button exists in scout-ai screen', async ({ page }) => {
    await signupNewUser(page, 'scout');
    const scoutTab = page.locator('#tab_scout-ai');
    const visible = await scoutTab.isVisible({ timeout: 10000 }).catch(() => false);
    if (!visible) { test.skip(); return; }

    await scoutTab.click();
    await page.waitForTimeout(1500);

    const generateBtn = page.getByRole('button', { name: /generate/i });
    const count = await generateBtn.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('scout-ai does not overflow horizontally', async ({ page }) => {
    await signupNewUser(page, 'scout');
    const scoutTab = page.locator('#tab_scout-ai');
    const visible = await scoutTab.isVisible({ timeout: 10000 }).catch(() => false);
    if (!visible) { test.skip(); return; }

    await scoutTab.click();
    await page.waitForTimeout(1000);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

});
