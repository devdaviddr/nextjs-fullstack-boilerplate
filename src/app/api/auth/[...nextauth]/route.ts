import { handlers } from '@/lib/auth'

// Auth.js mounts all of its endpoints (signin/signout/session/csrf/callback)
// under this catch-all route.
export const { GET, POST } = handlers
