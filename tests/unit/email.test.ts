import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted so the vi.mock factories below can safely reference them.
const { mockEnv, sendMail } = vi.hoisted(() => ({
  mockEnv: {} as Record<string, unknown>,
  sendMail: vi.fn(),
}))

vi.mock('@/lib/env', () => ({ env: mockEnv }))
vi.mock('@/lib/email/transport', () => ({
  getTransport: () => ({ sendMail }),
}))

import { isEmailEnabled, sendEmail } from '@/lib/email'

const CONFIGURED = {
  EMAIL_ENABLED: true,
  EMAIL_FROM: 'no-reply@example.com',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 587,
}

function setEnv(over: Record<string, unknown>) {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key]
  Object.assign(mockEnv, over)
}

const message = {
  to: 'user@example.com',
  subject: 'Hi',
  text: 'body',
  html: '<p>body</p>',
}

beforeEach(() => {
  sendMail.mockReset().mockResolvedValue({ messageId: 'abc' })
  setEnv({})
})

describe('email gating', () => {
  it('is disabled when EMAIL_ENABLED is false, even if fully configured', () => {
    setEnv({ ...CONFIGURED, EMAIL_ENABLED: false })
    expect(isEmailEnabled()).toBe(false)
  })

  it('is disabled when a provider var is missing, even if toggled on', () => {
    setEnv({ ...CONFIGURED, SMTP_HOST: undefined })
    expect(isEmailEnabled()).toBe(false)
  })

  it('is enabled only when toggled on AND fully configured', () => {
    setEnv(CONFIGURED)
    expect(isEmailEnabled()).toBe(true)
  })

  it('sendEmail no-ops and never touches the transport when disabled', async () => {
    setEnv({ ...CONFIGURED, EMAIL_ENABLED: false })
    const res = await sendEmail(message)
    expect(res).toEqual({
      sent: false,
      skipped: true,
      reason: 'email-disabled',
    })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('sendEmail delivers via the transport when enabled', async () => {
    setEnv(CONFIGURED)
    const res = await sendEmail(message)
    expect(res.sent).toBe(true)
    expect(sendMail).toHaveBeenCalledOnce()
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@example.com',
        to: 'user@example.com',
        subject: 'Hi',
      }),
    )
  })

  it('sendEmail swallows a transport error and reports not-sent', async () => {
    setEnv(CONFIGURED)
    sendMail.mockRejectedValueOnce(new Error('smtp down'))
    const res = await sendEmail(message)
    expect(res).toEqual({ sent: false, reason: 'send-error' })
  })
})
