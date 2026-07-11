// Generates the PWA/app icon set from a single inline SVG mark.
// Re-run after dropping in real branding:  pnpm gen:icons
// The mark is font-free (rects only) so it rasterizes deterministically.
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const THEME = '#0f172a' // background (slate-900)
const FG = '#ffffff' // mark
const root = fileURLToPath(new URL('..', import.meta.url))

// A minimal 2x2 "app grid" mark on a 100x100 canvas.
function svg({ maskable = false } = {}) {
  const bg = maskable
    ? `<rect width="100" height="100" fill="${THEME}"/>` // full-bleed for safe zone
    : `<rect width="100" height="100" rx="22" fill="${THEME}"/>`
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
${bg}
<g fill="${FG}">
  <rect x="28" y="28" width="18" height="18" rx="4"/>
  <rect x="54" y="28" width="18" height="18" rx="4"/>
  <rect x="28" y="54" width="18" height="18" rx="4"/>
  <rect x="54" y="54" width="18" height="18" rx="4"/>
</g>
</svg>`,
  )
}

async function render(source, size, rel) {
  const out = join(root, rel)
  await mkdir(dirname(out), { recursive: true })
  await sharp(source).resize(size, size).png().toFile(out)
  console.log('✓', rel)
}

const standard = svg()
const maskable = svg({ maskable: true })

await Promise.all([
  render(standard, 192, 'public/icon-192.png'),
  render(standard, 512, 'public/icon-512.png'),
  render(maskable, 512, 'public/icon-maskable-512.png'),
  render(standard, 512, 'src/app/icon.png'), // favicon (Next convention)
  render(standard, 180, 'src/app/apple-icon.png'), // apple-touch-icon
])

console.log('Icons generated. Swap the SVG in this script for real branding.')
