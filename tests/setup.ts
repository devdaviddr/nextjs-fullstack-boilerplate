import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Ensure a clean DOM between component tests.
afterEach(() => {
  cleanup()
})
