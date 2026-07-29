import { test, expect } from '@playwright/test';
import { quickLogin, navigateToTab } from './helpers';

test.describe('Neural Scout AI', () => {

  test('Scout AI tab is accessible', async ({ page }) => {
    await quickLogin(page);
    const scoutTab = page.locator('#tab_scout-ai');
    if (await scoutTab.isVisible()) {
      await scoutTab.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/neural scout|intelligence|select player|generate/);
    } else {
      // Tab may not be visible for player/fan accounts — that's correct behaviour
      test.skip();
    }
  });

  test('Player list shows seed players in Scout AI', async ({ page }) => {
    await quickLogin(page);
    const scoutTab = page.locator('#tab_scout-ai');
    if (await scoutTab.isVisible()) {
      await scoutTab.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').textContent();
      const hasPlayers = body?.includes('Sipho') || body?.includes('Ayanda') || body?.includes('Thabo');
      expect(hasPlayers).toBeTruthy();
    }
  });

  test('Generate button exists', async ({ page }) => {
    await quickLogin(page);
    const scoutTab = page.locator('#tab_scout-ai');
    if (await scoutTab.isVisible()) {
      await scoutTab.click();
      await page.waitForTimeout(1000);
      const generateBtn = page.getByRole('button', { name: /generate/i });
      // Button exists (may be disabled until player selected)
      expect(await generateBtn.count()).toBeGreaterThan(0);
    }
  });

  test('Selecting a player enables Generate button', async ({ page }) => {
    await quickLogin(page);
    const scoutTab = page.locator('#tab_scout-ai');
    if (await scoutTab.isVisible()) {
      await scoutTab.click();
      await page.waitForTimeout(1000);
      
      // Select first player in the list
      const playerOption = page.locator('[id*="scout_player_"], [class*="player-option"]').first()
        .or(page.getByText('Sipho Dlamini').first());
      
      if (await playerOption.isVisible()) {
        await playerOption.click();
        await page.waitForTimeout(500);
        
        const generateBtn = page.getByRole('button', { name: /generate/i });
        // After selection, button should be enabled
        expect(await generateBtn.isEnabled()).toBeTruthy();
      }
    }
  });

  test('Report generates (real or fallback)', async ({ page }) => {
    await quickLogin(page);
    const scoutTab = page.locator('#tab_scout-ai');
    if (await scoutTab.isVisible()) {
      await scoutTab.click();
      await page.waitForTimeout(1000);
      
      const playerOption = page.getByText('Sipho Dlamini').first();
      if (await playerOption.isVisible()) {
        await playerOption.click();
        await page.waitForTimeout(300);
        
        const generateBtn = page.getByRole('button', { name: /generate/i });
        if (await generateBtn.isEnabled()) {
          await generateBtn.click();
          // Wait up to 15 seconds for AI response
          await page.waitForTimeout(15000);
          const body = await page.locator('body').textContent();
          expect(body?.toLowerCase()).toMatch(/score|recommendation|pace|vision|finishing|trial|monitor/);
        }
      }
    }
  });

  test('Position benchmark appears after report', async ({ page }) => {
    await quickLogin(page);
    const scoutTab = page.locator('#tab_scout-ai');
    if (await scoutTab.isVisible()) {
      await scoutTab.click();
      await page.waitForTimeout(1000);
      
      const playerOption = page.getByText('Sipho Dlamini').first();
      if (await playerOption.isVisible()) {
        await playerOption.click();
        await page.waitForTimeout(300);
        const generateBtn = page.getByRole('button', { name: /generate/i });
        if (await generateBtn.isEnabled()) {
          await generateBtn.click();
          await page.waitForTimeout(15000);
          const body = await page.locator('body').textContent();
          expect(body?.toLowerCase()).toMatch(/top \d+%|benchmark|average|elite|developing/);
        }
      }
    }
  });

});
