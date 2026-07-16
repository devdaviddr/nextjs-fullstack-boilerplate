import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BuildInfoCard } from '@/components/settings/build-info-card'

describe('BuildInfoCard', () => {
  it('shows the version and 7-char short commit when baked in', () => {
    render(<BuildInfoCard version="v0.16.0" sha="abcdef1234567890" />)
    expect(screen.getByText('v0.16.0')).toBeTruthy()
    // SHA is truncated to 7 chars for display
    expect(screen.getByText('abcdef1')).toBeTruthy()
    expect(screen.queryByText('abcdef1234567890')).toBeNull()
  })

  it('renders with only a version (no commit)', () => {
    render(<BuildInfoCard version="v0.16.0" />)
    expect(screen.getByText('v0.16.0')).toBeTruthy()
  })

  it('falls back to a development-build note when nothing is baked in', () => {
    render(<BuildInfoCard />)
    expect(screen.getByText(/development build/i)).toBeTruthy()
  })
})
