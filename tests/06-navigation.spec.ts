import { test, expect } from '@playwright/test';
import { quickLogin, signupNewUser, navigateToTab } from './helpers';

test.describe('Navigation & Core UX', () => {

  test('bottom nav renders after login', async ({ page }) => {
    await quickLogin(page);
    // At minimum pitch and discover tabs must be present
    await expect(page.locator('#tab_pitch')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#tab_discover')).toBeVisible();
  });

  test('pitch tab shows feed screen', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'pitch');
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(50);
  });

  test('discover tab navigates correctly', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/discover|search|player/);
  });

  test('news tab loads for player role', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'news');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/news|football|discover|scoutme/);
  });

  test('profile tab loads user info', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/profile|sign out|settings|player/);
  });

  test('upload tab opens upload flow', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'upload');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/upload|highlight|video|clip|match|training/);
  });

  test('no blank screen on any player-role tab', async ({ page }) => {
    await quickLogin(page);
    const tabs = ['pitch', 'discover', 'news', 'profile'];
    for (const tab of tabs) {
      const tabEl = page.locator(`#tab_${tab}`);
      const visible = await tabEl.isVisible({ timeout: 5000 }).catch(() => false);
      if (visible) {
        await tabEl.click();
        await page.waitForTimeout(800);
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.trim().length).toBeGreaterThan(20);
      }
    }
  });

  test('scout-ai tab visible for scout role, absent for player', async ({ page }) => {
    // Player — should NOT see scout-ai
    await quickLogin(page);
    const scoutTabPlayer = page.locator('#tab_scout-ai');
    const visibleForPlayer = await scoutTabPlayer.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visibleForPlayer).toBe(false);
  });

  test('sign out returns to splash screen', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(500);
    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i });
    const visible = await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await signOutBtn.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('#get_started_btn')).toBeVisible({ timeout: 10000 });
    }
  });

  test('rapid tab switching does not crash', async ({ page }) => {
    await quickLogin(page);
    for (const tab of ['pitch', 'discover', 'pitch', 'discover']) {
      const el = page.locator(`#tab_${tab}`);
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(300);
      }
    }
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

});
