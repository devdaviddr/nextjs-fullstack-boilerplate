import { expect, test } from '@playwright/test'

// These exercise the error branches of the auth server actions through the UI.
// They rely on the seeded demo user (demo@example.com).

test('registering an already-used email shows an error', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Name').fill('Duplicate')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.getByLabel('Confirm password').fill('Password123')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText(/already exists/i)).toBeVisible()
  await expect(page).toHaveURL(/\/register/)
})

test('logging in with a wrong password shows an error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByLabel('Password', { exact: true }).fill('definitely-wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByText(/invalid email or password/i)).toBeVisible()
})

test('repeated failed logins are rate limited', async ({ page }) => {
  // A unique email → an isolated rate-limit bucket, so this can't affect other tests.
  const email = `ratelimit+${Date.now()}@example.com`
  await page.goto('/login')

  const submit = page.getByRole('button', { name: 'Sign in' })
  for (let i = 0; i < 9; i++) {
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('wrong-pass')
    await submit.click()
    await expect(submit).toBeEnabled() // wait for the action to resolve
  }

  await expect(page.getByText(/too many attempts/i)).toBeVisible()
})
