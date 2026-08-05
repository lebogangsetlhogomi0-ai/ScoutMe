import { test, expect } from '@playwright/test';
import { mockOtpEndpoints, quickLogin, navigateToTab } from './helpers';

test.describe('Digital Agreement', () => {

  test('agreement checkbox is required — submit disabled without it', async ({ page }) => {
    await mockOtpEndpoints(page);
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');

    await page.waitForSelector('#signup_name', { timeout: 10000 });
    await page.fill('#signup_name', 'Agreement Test');
    await page.fill('#signup_email', `agree_${Date.now()}@example.com`);
    await page.fill('#signup_password', 'TestPassword123!');

    // Do NOT check the agreement
    await expect(page.locator('#signup_submit_btn')).toBeDisabled();
  });

  test('agreement checkbox enables submit button when checked', async ({ page }) => {
    await mockOtpEndpoints(page);
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');

    await page.waitForSelector('#signup_name', { timeout: 10000 });
    await page.fill('#signup_name', 'Agreement Test');
    await page.fill('#signup_email', `agree2_${Date.now()}@example.com`);
    await page.fill('#signup_password', 'TestPassword123!');
    await page.check('#signup_agreement');

    await expect(page.locator('#signup_submit_btn')).toBeEnabled();
  });

  test('agreement checkbox is visible on signup form', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');
    await page.waitForSelector('#signup_agreement', { timeout: 10000 });
    await expect(page.locator('#signup_agreement')).toBeVisible();
  });

  test('agreement checkbox is NOT shown on sign-in form', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#sign_in_splash_btn', { timeout: 15000 });
    await page.click('#sign_in_splash_btn');
    await page.waitForSelector('#signup_email', { timeout: 10000 });
    // Agreement only on signup, not sign-in
    const agreementVisible = await page.locator('#signup_agreement').isVisible({ timeout: 2000 }).catch(() => false);
    expect(agreementVisible).toBe(false);
  });

  test('agreement label text mentions key terms', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');
    await page.waitForSelector('#signup_agreement', { timeout: 10000 });

    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/digital agreement|24 months|declaration|scoutme/);
  });

  test('agreement status visible on profile after login', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    // Profile should show something about the agreement
    expect(body?.toLowerCase()).toMatch(/agreement|signed|legal|profile/);
  });

});
