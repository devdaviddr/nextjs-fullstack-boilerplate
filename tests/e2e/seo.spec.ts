import { expect, test } from './fixtures'

// Verifies the share-link / SEO surface: robots, sitemap, and the OpenGraph /
// Twitter meta tags with absolute image URLs (the whole point — a shared link
// must unfurl to a preview card).

test('serves robots.txt with a sitemap reference', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.status()).toBe(200)
  const body = await res.text()
  expect(body).toContain('User-Agent: *')
  expect(body).toMatch(/Sitemap:\s*https?:\/\/.+\/sitemap\.xml/)
})

test('serves sitemap.xml listing public routes', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  const body = await res.text()
  expect(body).toContain('<urlset')
  expect(body).toContain('/login')
  expect(body).toContain('/register')
})

test('home page exposes OpenGraph and Twitter card metadata', async ({
  page,
}) => {
  await page.goto('/')

  // Image URL must be absolute (resolved via metadataBase) or unfurlers reject
  // it.
  const ogImage = page.locator('meta[property="og:image"]')
  await expect(ogImage).toHaveAttribute('content', /^https?:\/\/.+\/og\.png$/)

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    /.+/,
  )
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  )
})
