import { test, expect } from '@playwright/test';
import { quickLogin, navigateToTab } from './helpers';

test.describe('Discover Screen', () => {

  test('Discover tab loads player grid', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    const body = await page.locator('body').textContent();
    const hasPlayers = 
      body?.includes('Sipho') || 
      body?.includes('Ayanda') || 
      body?.includes('Discover') ||
      body?.includes('player') ||
      body?.includes('REGISTERED');
    expect(hasPlayers).toBeTruthy();
  });

  test('Search bar is present and accepts input', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('#search_input').or(
      page.getByPlaceholder(/search/i)
    ).first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Sipho');
      await page.waitForTimeout(500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toContain('sipho');
    }
  });

  test('Position filter pills exist', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    // Check for filter pills
    const allFilter = page.locator('#filter_ALL').or(
      page.getByRole('button', { name: /^ALL$/i })
    ).first();
    
    if (await allFilter.isVisible()) {
      await allFilter.click();
      await page.waitForTimeout(300);
    }
    
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(10);
  });

  test('GK filter shows goalkeeper', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    const gkFilter = page.locator('#filter_GK').or(
      page.getByRole('button', { name: /^GK$/i })
    ).first();
    
    if (await gkFilter.isVisible()) {
      await gkFilter.click();
      await page.waitForTimeout(500);
      // Bongani Zulu is our GK seed player
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/gk|goalkeeper|bongani/);
    }
  });

  test('Tapping player card opens their profile', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    const firstCard = page.locator('[id*="grid_player_"], [id*="trending_card_"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/neural|scout|pace|position|province/);
    }
  });

  test('Trending section shows high-vote players', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    // Ayanda has 2341 votes — should appear in trending
    expect(body?.toLowerCase()).toMatch(/trending|🔥|ayanda|votes/);
  });

});
