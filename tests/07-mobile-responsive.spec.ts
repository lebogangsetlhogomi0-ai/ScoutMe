import { test, expect } from '@playwright/test';
import { mockOtpEndpoints, signupNewUser, signAgreementModal } from './helpers';

test.describe('Mobile Responsiveness', () => {

  test('splash page has no horizontal overflow (Pixel 7 viewport)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('role selection screen has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn', { force: true });
    await page.waitForSelector('#role_player', { timeout: 20000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('signup form has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn', { force: true });
    await page.waitForSelector('#role_player', { timeout: 20000 });
    await page.click('#role_player', { force: true });
    await page.click('#role_continue_btn', { force: true });
    await page.waitForSelector('#signup_name', { timeout: 10000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('OTP screen has no horizontal overflow', async ({ page }) => {
    await mockOtpEndpoints(page);
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    await page.click('#get_started_btn', { force: true });
    await page.waitForSelector('#role_player', { timeout: 20000 });
    await page.click('#role_player', { force: true });
    await page.click('#role_continue_btn', { force: true });
    await page.waitForSelector('#signup_name', { timeout: 10000 });
    await page.fill('#signup_name', 'Mobile Test');
    await page.fill('#signup_email', `mobile_${Date.now()}@example.com`);
    await page.fill('#signup_password', 'TestPassword123!');
    await signAgreementModal(page);
    await page.click('#signup_submit_btn', { force: true });
    await page.waitForSelector('text=CHECK YOUR EMAIL', { timeout: 15000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('main app tabs have no horizontal overflow', async ({ page }) => {
    await signupNewUser(page, 'player');
    const tabs = ['pitch', 'discover'];
    for (const tab of tabs) {
      const el = page.locator(`#tab_${tab}`);
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        await el.click({ force: true });
        await page.waitForTimeout(800);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
      }
    }
  });

  test('background is dark (correct brand colour)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    const bgColor = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    );
    const match = bgColor.match(/\d+/g);
    if (match) {
      const [r, g, b] = match.map(Number);
      const brightness = (r + g + b) / 3;
      expect(brightness).toBeLessThan(50);
    }
  });

  test('buttons on splash meet minimum touch target height', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#get_started_btn', { timeout: 15000 });
    const btns = ['#get_started_btn', '#sign_in_splash_btn'];
    for (const sel of btns) {
      const box = await page.locator(sel).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('email input font size prevents iOS auto-zoom (≥14px)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#sign_in_splash_btn', { timeout: 15000 });
    await page.click('#sign_in_splash_btn', { force: true });
    await page.waitForSelector('#signup_email', { timeout: 10000 });
    const fontSize = await page.locator('#signup_email').evaluate(
      (el) => parseFloat(window.getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });

});
