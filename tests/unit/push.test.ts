import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mocks so the factories below can reference them.
const { mockEnv, sendNotification, setVapidDetails, deleteWhere, subs } =
  vi.hoisted(() => ({
    mockEnv: {} as Record<string, unknown>,
    sendNotification: vi.fn(),
    setVapidDetails: vi.fn(),
    deleteWhere: vi.fn().mockResolvedValue(undefined),
    subs: [] as Array<{
      id: string
      endpoint: string
      p256dh: string
      auth: string
    }>,
  }))

vi.mock('@/lib/env', () => ({ env: mockEnv }))
vi.mock('web-push', () => ({ default: { setVapidDetails, sendNotification } }))
vi.mock('@/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => Promise.resolve(subs) }) }),
    delete: () => ({ where: deleteWhere }),
  },
}))

import { isPushEnabled, sendPushNotification } from '@/lib/push'

const CONFIGURED = {
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:admin@example.com',
}

function setEnv(over: Record<string, unknown>) {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key]
  Object.assign(mockEnv, over)
}

beforeEach(() => {
  setEnv({})
  sendNotification.mockReset()
  deleteWhere.mockClear()
  subs.length = 0
})

describe('web push', () => {
  it('is disabled unless all three VAPID vars are set', () => {
    expect(isPushEnabled()).toBe(false)
    setEnv({ VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' })
    expect(isPushEnabled()).toBe(false)
    setEnv(CONFIGURED)
    expect(isPushEnabled()).toBe(true)
  })

  it('does not send when unconfigured (safe no-op)', async () => {
    setEnv({})
    subs.push({ id: 'a', endpoint: 'e', p256dh: 'x', auth: 'y' })
    await sendPushNotification('user1', { title: 't', body: 'b' })
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('sends to every subscription and prunes only the ones that are Gone', async () => {
    setEnv(CONFIGURED)
    subs.push(
      { id: 'gone', endpoint: 'gone-endpoint', p256dh: 'x', auth: 'y' },
      { id: 'ok', endpoint: 'ok-endpoint', p256dh: 'x', auth: 'y' },
    )
    sendNotification.mockImplementation((sub: { endpoint: string }) => {
      if (sub.endpoint === 'gone-endpoint') {
        return Promise.reject(
          Object.assign(new Error('gone'), { statusCode: 410 }),
        )
      }
      return Promise.resolve()
    })

    await sendPushNotification('user1', { title: 't', body: 'b', url: '/x' })

    // Attempted both...
    expect(sendNotification).toHaveBeenCalledTimes(2)
    // ...and pruned exactly the revoked one (410), not the healthy one.
    expect(deleteWhere).toHaveBeenCalledTimes(1)
  })

  it('does not prune on a transient (non-410) error', async () => {
    setEnv(CONFIGURED)
    subs.push({ id: 'a', endpoint: 'e', p256dh: 'x', auth: 'y' })
    sendNotification.mockRejectedValue(
      Object.assign(new Error('timeout'), { statusCode: 500 }),
    )

    await sendPushNotification('user1', { title: 't', body: 'b' })

    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(deleteWhere).not.toHaveBeenCalled()
  })
})
