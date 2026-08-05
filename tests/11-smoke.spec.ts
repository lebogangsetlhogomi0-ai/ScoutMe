import { test, expect } from '@playwright/test';
import { mockOtpEndpoints, fillAndVerifyOtp, completeWelcomeStep, quickLogin, navigateToTab } from './helpers';

test.describe('Smoke Tests — end-to-end critical paths', () => {

  test('app loads and shows ScoutMe branding', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toContain('scout');
  });

  test('full OTP signup flow completes without error', async ({ page }) => {
    await mockOtpEndpoints(page);
    await page.goto('/');

    // Splash
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');

    // Role
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');

    // Signup form
    await page.waitForSelector('#signup_name', { timeout: 10000 });
    await page.fill('#signup_name', 'Smoke Test Player');
    await page.fill('#signup_email', `smoke_${Date.now()}@example.com`);
    await page.fill('#signup_password', 'TestPassword123!');
    await page.check('#signup_agreement');
    await page.click('#signup_submit_btn');

    // OTP
    await fillAndVerifyOtp(page);

    // Welcome
    await completeWelcomeStep(page);

    // Inside app
    await expect(page.locator('#tab_pitch, #tab_discover')).toBeVisible({ timeout: 20000 });
  });

  test('main nav tabs present after login', async ({ page }) => {
    await quickLogin(page);
    await expect(page.locator('#tab_pitch')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#tab_discover')).toBeVisible();
    await expect(page.locator('#tab_upload')).toBeVisible();
  });

  test('pitch tab renders after login', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'pitch');
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('discover tab renders after login', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'discover');
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/discover|search|player/);
  });

  test('news tab renders after login', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'news');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/news|football|discover|scoutme/);
  });

  test('profile tab renders after login', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/profile|sign out|player/);
  });

  test('app does not crash on sign-in path (OTP mocked)', async ({ page }) => {
    // This exercises the sign-in button path — auth will fail for a non-existent account
    // but we confirm the UI does not white-screen
    await mockOtpEndpoints(page);
    await page.goto('/');
    await page.waitForSelector('#sign_in_splash_btn', { timeout: 15000 });
    await page.click('#sign_in_splash_btn');
    await page.waitForSelector('#signup_email', { timeout: 10000 });
    // Fill with non-existent creds — expect an error message, NOT a crash
    await page.fill('#signup_email', 'nonexistent@example.com');
    await page.fill('#signup_password', 'WrongPassword!');
    await page.click('#signup_submit_btn');
    await page.waitForTimeout(5000);
    const body = await page.locator('body').textContent();
    // Should show error or stay on form — not blank
    expect(body?.trim().length).toBeGreaterThan(20);
  });

  test('no page crash on any onboarding step', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');
    await page.waitForSelector('#signup_name', { timeout: 10000 });

    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

});
