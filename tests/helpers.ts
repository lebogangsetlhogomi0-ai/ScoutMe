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
  await page.waitForSelector('text=CHECK YOUR EMAIL', { timeout: 30000 });
  // Wait for OTP inputs to stabilize after screen transition
  await page.waitForTimeout(800);
  // Use evaluate to focus first input — avoids DOM-detach race during re-render
  await page.evaluate(() => {
    const input = document.querySelector('input[inputmode="numeric"]') as HTMLElement;
    if (input) input.focus();
  });
  await page.keyboard.type('123456', { delay: 200 });
  // Wait for VERIFY button to become enabled (disabled until all 6 digits registered)
  await page.waitForFunction(
    () => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => /verify code/i.test(b.textContent || ''));
      return btn && !btn.disabled;
    },
    { timeout: 10000 }
  ).catch(() => null); // if button never enables, OTP may have auto-submitted
  await page.waitForTimeout(300);
  const verifyBtn = page.getByRole('button', { name: /verify code/i });
  const isVisible = await verifyBtn.isVisible().catch(() => false);
  if (isVisible) {
    await verifyBtn.click({ force: true });
  }
}

/** Complete the welcome step (step 5 → step 6). */
export async function completeWelcomeStep(page: Page) {
  await page.waitForSelector('#lets_go_btn', { timeout: 15000 });
  await page.click('#lets_go_btn', { force: true });
}

/**
 * Sign the digital agreement via the modal flow.
 * Clicks the "Read & Sign" button, scrolls the modal to bottom,
 * ticks both checkboxes, and clicks "I AGREE AND SIGN".
 * Waits for the modal to close (2s animation).
 */
export async function signAgreementModal(page: Page) {
  await page.waitForSelector('#open_agreement_btn:not([disabled])', { timeout: 10000 });
  await page.click('#open_agreement_btn');
  await page.waitForSelector('#agreement_scroll_container', { timeout: 10000 });
  // Scroll the modal document to bottom to unlock checkboxes
  await page.evaluate(() => {
    const el = document.getElementById('agreement_scroll_container');
    if (el) {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event('scroll'));
    }
  });
  await page.waitForTimeout(600);
  // Checkboxes should now be enabled
  await page.check('#checkbox_modal_verify', { force: true });
  await page.check('#checkbox_modal_consent', { force: true });
  await page.click('#sign_agreement_modal_submit', { force: true, noWaitAfter: true });
  // Modal closes after 2s setTimeout in handleSign
  await page.waitForTimeout(2500);
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
  await page.click('#get_started_btn', { force: true });

  // Role selection — 20s for transition animation
  const roleId = role === 'player' ? '#role_player' : role === 'scout' ? '#role_scout' : '#role_fan';
  await page.waitForSelector(roleId, { timeout: 20000 });
  await page.click(roleId, { force: true });
  await page.click('#role_continue_btn', { force: true });

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

  // Sign the digital agreement via modal (replaces old checkbox)
  await signAgreementModal(page);

  await page.click('#signup_submit_btn', { force: true });

  // OTP step
  await fillAndVerifyOtp(page);

  // Welcome step
  await completeWelcomeStep(page);

  // Wait for the main app shell to appear
  await page.waitForSelector('#tab_pitch', { timeout: 20000 });

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
  await tab.click({ force: true });
  await page.waitForTimeout(1500);
}
