import { Page } from '@playwright/test';

export async function quickLogin(page: Page, email = 'test@scoutme.co.za', password = 'password123') {
  await page.goto('/');
  await page.waitForTimeout(3000);
  const signInBtn = page.getByRole('button', { name: /sign in/i });
  if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signInBtn.click();
    await page.waitForTimeout(1000);
  }
  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(email);
  }
  const passInput = page.locator('input[type="password"]').first();
  if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passInput.fill(password);
  }
  const submitBtn = page.getByRole('button', { name: /sign in|login/i }).last();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
  }
  await page.waitForTimeout(5000);
}

export async function navigateToTab(page: Page, tabId: string) {
  const tab = page.locator(`#tab_${tabId}`).or(page.getByRole('button', { name: new RegExp(tabId, 'i') })).first();
  if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(5000);
  }
}
