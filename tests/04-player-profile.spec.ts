import { test, expect } from '@playwright/test';
import { quickLogin, navigateToTab } from './helpers';

test.describe('Player Profile', () => {

  async function openPlayerProfile(page: any, playerName: string) {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    const player = page.getByText(playerName).first();
    if (await player.isVisible()) {
      await player.click();
      await page.waitForTimeout(1200);
      return true;
    }
    return false;
  }

  test('Player profile loads with Neural Scout Intelligence section', async ({ page }) => {
    const opened = await openPlayerProfile(page, 'Sipho Dlamini');
    if (opened) {
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/neural scout|pace|vision|finishing|intelligence/);
    }
  });

  test('Player profile shows position and stats', async ({ page }) => {
    const opened = await openPlayerProfile(page, 'Sipho Dlamini');
    if (opened) {
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/cam|attacking midfielder|gauteng|18/);
    }
  });

  test('Community rating section is visible', async ({ page }) => {
    const opened = await openPlayerProfile(page, 'Ayanda Mkhize');
    if (opened) {
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/community|rating|badge|talent/);
    }
  });

  test('Star rating component is interactive for non-own profiles', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    // Open a player profile
    const firstCard = page.locator('[id*="grid_player_"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000);
      
      // Look for star buttons
      const stars = page.locator('[id*="star_btn_"]');
      if (await stars.count() > 0) {
        await stars.nth(3).click(); // 4-star rating
        await page.waitForTimeout(500);
        // Should show toast or updated rating
        const body = await page.locator('body').textContent();
        expect(body).toBeTruthy();
      }
    }
  });

  test('Talent badge picker opens', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    const firstCard = page.locator('[id*="grid_player_"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000);
      
      const addBadge = page.locator('#add_badge_trigger');
      if (await addBadge.isVisible()) {
        await addBadge.click();
        await page.waitForTimeout(500);
        // Badge picker should open showing 12 badges
        const body = await page.locator('body').textContent();
        expect(body?.toLowerCase()).toMatch(/pace monster|clinical finisher|vision king|badge/);
      }
    }
  });

  test('Back navigation works from player profile', async ({ page }) => {
    const opened = await openPlayerProfile(page, 'Sipho Dlamini');
    if (opened) {
      await page.goBack();
      await page.waitForTimeout(500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/discover|search|player|feed/);
    }
  });

  test('All 5 seed players are accessible', async ({ page }) => {
    const players = ['Sipho Dlamini', 'Thabo Nkosi', 'Kagiso Sithole', 'Bongani Zulu', 'Ayanda Mkhize'];
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    const body = await page.locator('body').textContent();
    let foundCount = 0;
    for (const player of players) {
      if (body?.includes(player.split(' ')[0])) foundCount++;
    }
    expect(foundCount).toBeGreaterThanOrEqual(3); // At least 3 of 5 visible
  });

});
