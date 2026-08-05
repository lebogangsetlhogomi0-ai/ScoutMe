import { test, expect } from '@playwright/test';
import { mockOtpEndpoints, fillAndVerifyOtp, completeWelcomeStep } from './helpers';

test.describe('Splash Screen & Authentication', () => {

  test('splash screen loads with ScoutMe branding', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toContain('scout');
  });

  test('splash has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('GET STARTED button advances to role selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    // Step 2: role selection
    await expect(page.locator('#role_player')).toBeVisible({ timeout: 10000 });
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/who are you|player|scout/);
  });

  test('role selection shows Player, Scout/Club, Fan cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await expect(page.locator('#role_player')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#role_scout')).toBeVisible();
    await expect(page.locator('#role_fan')).toBeVisible();
  });

  test('CONTINUE button disabled until role is selected', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_continue_btn', { timeout: 10000 });
    await expect(page.locator('#role_continue_btn')).toBeDisabled();
    await page.click('#role_player');
    await expect(page.locator('#role_continue_btn')).toBeEnabled();
  });

  test('selecting Player role and continuing shows signup form', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');
    await expect(page.locator('#signup_name')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#signup_email')).toBeVisible();
    await expect(page.locator('#signup_password')).toBeVisible();
  });

  test('SIGN IN button goes directly to sign-in form', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#sign_in_splash_btn', { timeout: 15000 });
    await page.click('#sign_in_splash_btn');
    // Sign-in goes straight to step 3 form
    await expect(page.locator('#signup_email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#signin_role')).toBeVisible();
    // Should NOT show name field (sign-in mode)
    await expect(page.locator('#signup_name')).not.toBeVisible();
  });

  test('back button on role selection returns to splash', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#onboarding_back_btn', { timeout: 10000 });
    await page.click('#onboarding_back_btn');
    await expect(page.locator('#get_started_btn')).toBeVisible({ timeout: 10000 });
  });

  test('OTP screen appears after submitting signup form', async ({ page }) => {
    await mockOtpEndpoints(page);
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');

    await page.waitForSelector('#signup_name', { timeout: 10000 });
    await page.fill('#signup_name', 'OTP Test User');
    await page.fill('#signup_email', `otp_test_${Date.now()}@example.com`);
    await page.fill('#signup_password', 'TestPassword123!');
    await page.check('#signup_agreement');
    await page.click('#signup_submit_btn');

    await expect(page.locator('text=CHECK YOUR EMAIL')).toBeVisible({ timeout: 15000 });
    // 6 OTP digit boxes
    const otpInputs = page.locator('input[inputmode="numeric"]');
    await expect(otpInputs).toHaveCount(6, { timeout: 5000 });
  });

  test('full signup → OTP → welcome flow completes', async ({ page }) => {
    await mockOtpEndpoints(page);
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');

    await page.waitForSelector('#signup_name', { timeout: 10000 });
    await page.fill('#signup_name', 'Flow Test User');
    await page.fill('#signup_email', `flow_${Date.now()}@example.com`);
    await page.fill('#signup_password', 'TestPassword123!');
    await page.check('#signup_agreement');
    await page.click('#signup_submit_btn');

    await fillAndVerifyOtp(page);
    await completeWelcomeStep(page);

    // Should land inside the app
    await expect(page.locator('#tab_pitch, #tab_discover')).toBeVisible({ timeout: 20000 });
  });

});
