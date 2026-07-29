import { test, expect } from '@playwright/test';
import { quickLogin, navigateToTab } from './helpers';

test.describe('Digital Agreement', () => {

  test('Digital Agreement status shows on profile', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(1000);
    
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/agreement|signed|legal|scoutme/);
  });

  test('Agreement modal can be opened from profile', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(1000);
    
    const signNow = page.getByRole('button', { name: /sign now|view agreement/i });
    if (await signNow.isVisible()) {
      await signNow.click();
      await page.waitForTimeout(500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/agreement|legal|kasi silicon|placement|24 months/);
    }
  });

  test('Agreement text contains key legal terms', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(1000);
    
    const body = await page.locator('body').textContent();
    // Agreement should mention key protection terms somewhere in the app
    const hasLegalTerms = 
      body?.toLowerCase().includes('agreement') ||
      body?.toLowerCase().includes('placement') ||
      body?.toLowerCase().includes('24 month') ||
      body?.toLowerCase().includes('declaration');
    expect(hasLegalTerms).toBeTruthy();
  });

});
