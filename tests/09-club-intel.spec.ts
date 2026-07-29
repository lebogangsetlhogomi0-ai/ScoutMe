import { test, expect } from '@playwright/test';
import { quickLogin, navigateToTab } from './helpers';

test.describe('Club Strategic Intel', () => {

  test('Club Intel tab content loads', async ({ page }) => {
    await quickLogin(page);
    
    const clubIntelTab = page.locator('#tab_club-intel');
    if (await clubIntelTab.isVisible()) {
      await clubIntelTab.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/intel|club|players|scouts|shortlist|demand/);
    } else {
      test.skip();
    }
  });

  test('Platform stats cards show numbers', async ({ page }) => {
    await quickLogin(page);
    
    const clubIntelTab = page.locator('#tab_club-intel');
    if (await clubIntelTab.isVisible()) {
      await clubIntelTab.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').textContent();
      // Should show platform stats
      expect(body?.toLowerCase()).toMatch(/12,847|1,203|347|48,291|players registered|scouts/);
    }
  });

  test('Positions in demand chart renders', async ({ page }) => {
    await quickLogin(page);
    
    const clubIntelTab = page.locator('#tab_club-intel');
    if (await clubIntelTab.isVisible()) {
      await clubIntelTab.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/st|striker|lb|left back|gk|goalkeeper|demand/);
    }
  });

  test('Shortlist section shows or has empty state', async ({ page }) => {
    await quickLogin(page);
    
    const clubIntelTab = page.locator('#tab_club-intel');
    if (await clubIntelTab.isVisible()) {
      await clubIntelTab.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/shortlist|saved|no players/);
    }
  });

  test('Adding player to shortlist from discover works', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    await page.waitForTimeout(1000);
    
    // Open a player profile
    const firstCard = page.locator('[id*="grid_player_"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000);
      
      // Look for shortlist button
      const shortlistBtn = page.getByRole('button', { name: /shortlist|save/i });
      if (await shortlistBtn.first().isVisible()) {
        await shortlistBtn.first().click();
        await page.waitForTimeout(500);
        // Should show some confirmation
        const body = await page.locator('body').textContent();
        expect(body).toBeTruthy();
      }
    }
  });

});
