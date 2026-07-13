import { execSync } from 'node:child_process'

// Ensure the seeded demo admin (`demo@example.com`) and the base roles exist
// before the suite runs — many tests log in as that admin. The seed is
// idempotent, so this is safe to run every time and makes local runs
// self-healing if the dev DB was mutated. CI also seeds explicitly; this is a
// belt-and-braces guard.
export default function globalSetup() {
  execSync('pnpm db:seed', { stdio: 'inherit' })
}
