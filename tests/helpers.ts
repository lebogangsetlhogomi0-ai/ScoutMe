import { Page } from '@playwright/test';

/** Mock both OTP API endpoints so no real email is needed. */
export async function mockOtpEndpoints(page: Page) {
  await page.route('**/api/send-otp', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  );
  await page.route('**/api/verify-otp', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true }) })
  );
}

/** Fill the 6 OTP digit boxes with 1–6 and click Verify. */
export async function fillAndVerifyOtp(page: Page) {
  // Wait for OTP step to appear (step 4 shows "CHECK YOUR EMAIL")
  await page.waitForSelector('text=CHECK YOUR EMAIL', { timeout: 15000 });
  const digits = page.locator('input[inputmode="numeric"]');
  await digits.nth(0).fill('1');
  await digits.nth(1).fill('2');
  await digits.nth(2).fill('3');
  await digits.nth(3).fill('4');
  await digits.nth(4).fill('5');
  await digits.nth(5).fill('6');
  await page.getByRole('button', { name: /verify code/i }).click();
}

/** Complete the welcome step (step 5 → step 6). */
export async function completeWelcomeStep(page: Page) {
  await page.waitForSelector('#lets_go_btn', { timeout: 15000 });
  await page.click('#lets_go_btn');
}

/**
 * Sign up a new player account using the full onboarding flow.
 * OTP endpoints are mocked so no real email is received.
 * Returns the email used.
 */
export async function signupNewUser(
  page: Page,
  role: 'player' | 'scout' | 'fan' = 'player',
  emailOverride?: string
): Promise<string> {
  const email = emailOverride ?? `test_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  await mockOtpEndpoints(page);
  await page.goto('/');

  // Splash → GET STARTED
  await page.waitForSelector('#get_started_btn', { timeout: 15000 });
  await page.click('#get_started_btn');

  // Role selection
  const roleId = role === 'player' ? '#role_player' : role === 'scout' ? '#role_scout' : '#role_fan';
  await page.waitForSelector(roleId, { timeout: 10000 });
  await page.click(roleId);
  await page.click('#role_continue_btn');

  // Signup form (step 3)
  await page.waitForSelector('#signup_name', { timeout: 10000 });
  await page.fill('#signup_name', 'Test User');
  await page.fill('#signup_email', email);
  await page.fill('#signup_password', password);

  // Fill scout-specific required field
  if (role === 'scout') {
    await page.waitForSelector('#signup_organisation', { timeout: 5000 }).catch(() => null);
    const orgInput = page.locator('#signup_organisation');
    if (await orgInput.isVisible().catch(() => false)) {
      await orgInput.fill('Test Scouting Agency');
    }
  }

  // Agreement checkbox required for signup
  await page.check('#signup_agreement');
  await page.click('#signup_submit_btn');

  // OTP step
  await fillAndVerifyOtp(page);

  // Welcome step
  await completeWelcomeStep(page);

  // Wait for the main app shell to appear
  await page.waitForSelector('#tab_pitch, #tab_discover', { timeout: 20000 });

  return email;
}

/**
 * Quick login alias — creates a fresh player account via signup.
 * Use this in tests that just need to be inside the app.
 */
export async function quickLogin(page: Page): Promise<string> {
  return signupNewUser(page, 'player');
}

/** Click a bottom-nav tab by its ID suffix (e.g. "discover", "pitch"). */
export async function navigateToTab(page: Page, tabId: string) {
  const tab = page.locator(`#tab_${tabId}`);
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(1500);
}
