import { expect, test } from './fixtures'

// Route + UI behaviour of the reset/verify pages. The full send→click→reset
// round-trip lives in email-flow.spec.ts (against Mailpit). The FR6
// "email not configured" message is covered by a unit test
// (tests/unit/recovery-actions.test.ts) since the e2e suite runs with email on.

test('login links to the forgot-password page', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL(/\/forgot-password/)
  await expect(page.getByText(/forgot your password/i)).toBeVisible()
})

test('forgot-password gives the same anti-enumeration reply for any email', async ({
  page,
}) => {
  // For an unregistered email it must NOT reveal that no account exists — the
  // response is the generic "if an account exists…" message.
  await page.goto('/forgot-password')
  await page.getByLabel('Email').fill(`nobody+${Date.now()}@example.com`)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText(/if an account exists/i)).toBeVisible()
})

test('reset-password rejects a link with no token', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByText(/invalid reset link/i)).toBeVisible()
})

test('verify-email shows failure for an invalid token', async ({ page }) => {
  await page.goto('/verify-email?token=bogus&email=nobody@example.com')
  await expect(page.getByText(/verification failed/i)).toBeVisible()
})
