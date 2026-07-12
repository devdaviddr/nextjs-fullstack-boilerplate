import { expect, test } from '@playwright/test'

// RBAC: relies on the seeded admin (demo@example.com / Password123).

test('a non-admin user does not see the admin panel', async ({ page }) => {
  const email = `noadmin+${Date.now()}@example.com`

  // Register a fresh user (gets no roles) — lands on the dashboard.
  await page.goto('/register')
  await page.getByLabel('Name').fill('No Admin')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.getByLabel('Confirm password').fill('Password123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.goto('/settings')
  await expect(page.getByText('Current User')).toBeVisible()
  // The admin panel and its "Add User" control must not render.
  await expect(page.getByRole('button', { name: 'Add User' })).toHaveCount(0)
})

test('an admin can view the panel and create a user', async ({ page }) => {
  // Sign in as the seeded admin.
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.goto('/settings')
  await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible()

  const newEmail = `created+${Date.now()}@example.com`
  await page.getByRole('button', { name: 'Add User' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Ada Lovelace').fill('Created User')
  await dialog.getByPlaceholder('user@example.com').fill(newEmail)
  // Pick a role (required) — click the checkbox inside the "member" option.
  await dialog
    .locator('label')
    .filter({ hasText: /^member$/ })
    .getByRole('checkbox')
    .click()
  await dialog.getByRole('button', { name: 'Create' }).click()

  // Dialog closes and the new user appears in the table.
  await expect(page.getByText(newEmail)).toBeVisible()
})
