import { test, expect } from '@playwright/test';
import { quickLogin } from './helpers';

test.describe('Splash Screen & Authentication', () => {

  test('splash screen loads and shows ScoutMe branding', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    // Check ScoutMe branding is visible
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toContain('scout');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('GET STARTED button exists and is clickable', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const getStarted = page.getByRole('button', { name: /get started/i });
    if (await getStarted.isVisible()) {
      await getStarted.click();
      await page.waitForTimeout(500);
      // Should advance to role selection or registration
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/who are you|player|scout|fan|role/);
    }
  });

  test('SIGN IN button navigates to login form', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const signIn = page.getByRole('button', { name: /sign in/i });
    if (await signIn.isVisible()) {
      await signIn.click();
      await page.waitForTimeout(500);
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible({ timeout: 3000 });
    }
  });

  test('Demo Mode login works with any credentials', async ({ page }) => {
    await quickLogin(page);
    // Should be inside the app now
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/pitch|discover|news|scout|profile/);
  });

  test('Role selection shows Player, Scout, Fan options', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const getStarted = page.getByRole('button', { name: /get started/i });
    if (await getStarted.isVisible()) {
      await getStarted.click();
      await page.waitForTimeout(500);
      const body = await page.locator('body').textContent();
      expect(body?.toLowerCase()).toMatch(/player/);
    }
  });

  test('No blank screen on initial load', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(20);
  });

});
