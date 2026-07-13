import { expect, test } from './fixtures'

test('serves a valid web app manifest', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()

  const manifest = await res.json()
  expect(manifest.name).toBeTruthy()
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')

  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toContain('192x192')
  expect(sizes).toContain('512x512')

  const purposes = manifest.icons.map((i: { purpose?: string }) => i.purpose)
  expect(purposes).toContain('maskable')
})

test('serves the service worker with no-store cache headers', async ({
  request,
}) => {
  const res = await request.get('/sw.js')
  expect(res.ok()).toBeTruthy()
  expect(res.headers()['cache-control']).toContain('no-cache')
})

test('offline fallback page renders', async ({ page }) => {
  await page.goto('/offline')
  await expect(
    page.getByRole('heading', { name: /you're offline/i }),
  ).toBeVisible()
})

test('protected settings route redirects unauthenticated users', async ({
  page,
}) => {
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/login/)
})
