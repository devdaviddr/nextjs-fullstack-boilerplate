import { expect, test } from './fixtures'

// The email round-trip (send link → click → reset) needs a mail catcher and is
// verified manually (see spec 0011). These cover the routes and the
// email-disabled behaviour, which is the default in the test env.

test('login links to the forgot-password page', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL(/\/forgot-password/)
  await expect(page.getByText(/forgot your password/i)).toBeVisible()
})

test('forgot-password explains when email is not configured', async ({
  page,
}) => {
  // The test deployment has no email provider, so requesting a reset must say
  // so (FR6) rather than pretend to send.
  await page.goto('/forgot-password')
  await page.getByLabel('Email').fill('someone@example.com')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText(/isn't configured/i)).toBeVisible()
})

test('reset-password rejects a link with no token', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByText(/invalid reset link/i)).toBeVisible()
})

test('verify-email shows failure for an invalid token', async ({ page }) => {
  await page.goto('/verify-email?token=bogus&email=nobody@example.com')
  await expect(page.getByText(/verification failed/i)).toBeVisible()
})
