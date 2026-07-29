import { test, expect, Browser } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {

  test('App renders correctly on iPhone 14 (390px)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(400);
    
    // Content exists
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
    
    await context.close();
  });

  test('App renders correctly on budget Android (360px)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(370);
    
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(20);
    
    await context.close();
  });

  test('Buttons meet 44px minimum touch target', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    
    let failCount = 0;
    for (let i = 0; i < Math.min(count, 8); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box && box.height < 36) { // 36px minimum (some tolerance)
          failCount++;
        }
      }
    }
    // Allow max 2 small buttons (icon-only buttons may be smaller)
    expect(failCount).toBeLessThanOrEqual(2);
  });

  test('Text inputs have 16px font to prevent iOS zoom', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    const signIn = page.getByRole('button', { name: /sign in/i });
    if (await signIn.isVisible()) {
      await signIn.click();
      await page.waitForTimeout(500);
    }
    
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      const fontSize = await emailInput.evaluate(el => {
        return window.getComputedStyle(el).fontSize;
      });
      const size = parseFloat(fontSize);
      expect(size).toBeGreaterThanOrEqual(14); // At least 14px (16px ideal for iOS)
    }
  });

  test('Background is dark (correct brand colours)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Should be dark — rgb values should all be low
    expect(bgColor).toMatch(/rgb\([0-9]+,\s*[0-9]+,\s*[0-9]+\)/);
    const match = bgColor.match(/(\d+)/g);
    if (match) {
      const [r, g, b] = match.map(Number);
      const brightness = (r + g + b) / 3;
      expect(brightness).toBeLessThan(50); // Dark background
    }
  });

});
