import { expect, test } from '@playwright/test'

// OAuth UI behaviour that's verifiable without real provider credentials.
// The full round-trip (GitHub/Google → user creation, linking, unlinking) needs
// configured provider secrets and is verified manually per spec 0010.

test('login hides OAuth buttons when no provider is configured', async ({
  page,
}) => {
  await page.goto('/login')
  // Default (test) env sets no OAuth vars, so no provider buttons appear...
  await expect(
    page.getByRole('button', { name: /Continue with GitHub/ }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Continue with Google/ }),
  ).toHaveCount(0)
  // ...and the credentials form is unchanged (regression / NFR2).
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('login surfaces the account-not-linked message from ?error', async ({
  page,
}) => {
  await page.goto('/login?error=OAuthAccountNotLinked')
  // Target the message text directly — `getByRole('alert')` also matches
  // Next.js's empty route-announcer div, tripping strict mode.
  await expect(page.getByText(/already exists/i)).toBeVisible()
})
