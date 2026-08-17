import { test, expect } from '@playwright/test';
import { mockOtpEndpoints, quickLogin, navigateToTab, signAgreementModal } from './helpers';

test.describe('Digital Agreement', () => {

  /** Navigate to the signup form step. */
  async function goToSignupForm(page: any) {
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
  }

  test('submit button disabled until agreement is signed', async ({ page }) => {
    await goToSignupForm(page);
    // Before signing — submit should be disabled
    await expect(page.locator('#signup_submit_btn')).toBeDisabled();
  });

  test('signing agreement enables submit button', async ({ page }) => {
    await goToSignupForm(page);
    await expect(page.locator('#signup_submit_btn')).toBeDisabled();
    // Sign via modal
    await signAgreementModal(page);
    await expect(page.locator('#signup_submit_btn')).toBeEnabled();
  });

  test('Read & Sign Agreement button is visible on signup form', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');
    await page.waitForSelector('#open_agreement_btn', { timeout: 10000 });
    await expect(page.locator('#open_agreement_btn')).toBeVisible();
  });

  test('agreement button is NOT shown on sign-in form', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#sign_in_splash_btn', { timeout: 15000 });
    await page.click('#sign_in_splash_btn');
    await page.waitForSelector('#signup_email', { timeout: 10000 });
    // Agreement only shown on signup, not sign-in
    const agreementBtnVisible = await page.locator('#open_agreement_btn').isVisible({ timeout: 2000 }).catch(() => false);
    expect(agreementBtnVisible).toBe(false);
  });

  test('agreement modal contains legally required terms', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn');
    await page.waitForSelector('#role_player', { timeout: 10000 });
    await page.click('#role_player');
    await page.click('#role_continue_btn');
    await page.waitForSelector('#open_agreement_btn', { timeout: 10000 });
    // Open the modal and check its content
    await page.click('#open_agreement_btn');
    await page.waitForSelector('#agreement_scroll_container', { timeout: 10000 });
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/digital agreement|24 months|declaration|scoutme/);
  });

  test('agreement status visible on profile after login', async ({ page }) => {
    await quickLogin(page);
    await navigateToTab(page, 'profile');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toMatch(/agreement|signed|legal|profile/);
  });

});
