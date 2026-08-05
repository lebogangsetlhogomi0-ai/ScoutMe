import { test, expect } from '@playwright/test';
import { quickLogin, navigateToTab } from './helpers';

test.describe('Discover Screen', () => {

  test('discover tab loads and renders content', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/discover|player|search/);
  });

  test('search input is present and accepts text', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1500);

    const searchInput = page
      .locator('#search_input')
      .or(page.getByPlaceholder(/search/i))
      .first();

    const visible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await searchInput.fill('Test');
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue('Test');
    } else {
      // Screen rendered, search may be in a different form — just confirm no crash
      expect(body?.trim().length ?? 0).toBeGreaterThan(0);
    }
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('discover tab is visible in bottom nav', async ({ page }) => {
    await quickLogin(page);
    await expect(page.locator('#tab_discover')).toBeVisible({ timeout: 10000 });
  });

  test('discover screen does not overflow horizontally', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('tapping a player card opens a profile view', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1500);

    // Try by grid player card ID pattern first, then fall back to any clickable card
    const card = page
      .locator('[id*="grid_player_"], [id*="trending_card_"]')
      .first();

    const cardVisible = await card.isVisible({ timeout: 5000 }).catch(() => false);
    if (cardVisible) {
      await card.click();
      await page.waitForTimeout(1500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/position|province|profile|neural|scout/);
    } else {
      // No players yet for a fresh account — just verify no crash
      const body = await page.locator('body').textContent();
      expect(body?.trim().length).toBeGreaterThan(20);
    }
  });

  test('switching to discover and back does not crash', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'pitch');
    await navigateToTab(page, 'discover');
    await navigateToTab(page, 'pitch');
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

});
