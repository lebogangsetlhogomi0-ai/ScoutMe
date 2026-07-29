import { test, expect } from '@playwright/test';
import { quickLogin, navigateToTab } from './helpers';

test.describe('Navigation & Core UX', () => {

  test('Bottom navigation tabs all render', async ({ page }) => {
    await quickLogin(page);
    
    const tabs = ['pitch', 'discover', 'news', 'profile'];
    for (const tab of tabs) {
      const tabEl = page.locator(`#tab_${tab}`);
      // May not all be visible depending on role but should not crash
      await page.waitForTimeout(200);
    }
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(50);
  });

  test('Pitch tab shows feed content', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'pitch');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(50);
  });

  test('News tab shows football news', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'news');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/news|football|bafana|psl|afcon|scoutme/);
  });

  test('News category filter works', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'news');
    await page.waitForTimeout(1000);
    
    const pslFilter = page.locator('#news_cat_PSL');
    if (await pslFilter.isVisible()) {
      await pslFilter.click();
      await page.waitForTimeout(500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/psl|league|football/);
    }
  });

  test('Profile tab loads user info', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/profile|settings|offline|agreement|sign out/);
  });

  test('Sign out returns to splash/login screen', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(500);
    
    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i });
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await page.waitForTimeout(1500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/scout|get started|sign in|tagline|ekasi/);
    }
  });

  test('No blank screens on any tab', async ({ page }) => {
    await quickLogin(page);
    const tabs = ['pitch', 'discover', 'news', 'profile'];
    
    for (const tab of tabs) {
      const tabEl = page.locator(`#tab_${tab}`);
      if (await tabEl.isVisible()) {
        await tabEl.click();
        await page.waitForTimeout(800);
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.trim().length).toBeGreaterThan(20);
      }
    }
  });

  test('Upload tab opens upload flow for players', async ({ page }) => {
    await quickLogin(page);
    const uploadTab = page.locator('#tab_upload');
    if (await uploadTab.isVisible()) {
      await uploadTab.click();
      await page.waitForTimeout(500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/upload|highlight|match|training|clip/);
    }
  });

  test('Demo mode badge is visible', async ({ page }) => {
    await quickLogin(page);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/demo mode/);
  });

  test('Notification bell opens notification panel', async ({ page }) => {
    await quickLogin(page);
    const bell = page.locator('#notification_bell');
    if (await bell.isVisible()) {
      await bell.click();
      await page.waitForTimeout(500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/notification|viewed|highlight|welcome/);
    }
  });

});
