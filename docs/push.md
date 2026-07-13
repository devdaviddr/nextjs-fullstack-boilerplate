# Web Push notifications

[← Back to README](../README.md)

Send notifications to a user's device even when the app is closed, via the
[Web Push protocol](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
**Opt-in** — the feature (including its Settings toggle) is fully inert until the
`VAPID_*` env vars are set, so a fork without them is unaffected.

Built on the [`web-push`](https://github.com/web-push-libs/web-push) library and
self-managed VAPID keys — no third-party push service
([spec 0015](../specs/0015-web-push-notifications.md)).

## Requirements

- **HTTPS** and an **installed service worker** — Web Push only works in a
  secure context, and the service worker registers in production only. Locally,
  test against a production build (`pnpm build && pnpm start`) over HTTPS, or a
  real deployment (Cloudflare Tunnel provides HTTPS — see
  [Deployment](deployment.md)).

## Setup

Generate a VAPID keypair once, then set all three env vars and restart:

```bash
npx web-push generate-vapid-keys
```

```bash
VAPID_PUBLIC_KEY="B..."                     # safe to expose to the client
VAPID_PRIVATE_KEY="..."                      # server-only — never sent to the client
VAPID_SUBJECT="mailto:you@example.com"       # a contact URL for push services
```

With these set, an **"Enable notifications"** toggle appears in Settings.

## How it works

- **Subscribe** — the Settings panel
  (`src/components/push/notifications-panel.tsx`) requests browser permission,
  calls `pushManager.subscribe({ applicationServerKey })`, and POSTs the
  subscription to the `saveSubscription` server action. Each browser/device is a
  row in **`push_subscriptions`** (`endpoint` unique); one user can have many.
  Disabling calls `unsubscribe()` and deletes the row (ownership-checked).
- **Send** — `src/lib/push/`:
  - `sendPushNotification(userId, { title, body, url })` — sends to every
    subscription for that user.
  - `notifyRole('admin', payload)` — sends to every user holding a role.
  - Both are **best-effort and non-blocking** (a send failure never breaks the
    triggering action, mirroring `sendEmail`) and **auto-prune** any
    subscription the push service reports as Gone (HTTP 404/410), so dead rows
    never accumulate.
- **Receive** — the service worker (`public/sw.js`) handles `push` (shows the
  notification) and `notificationclick` (focuses an existing tab on the target
  URL, or opens a new one).
- **Worked example** — admins are notified when a new user self-registers
  (`registerAction` → `notifyRole('admin', …)`), proving the send path end to
  end rather than shipping only the primitive.

## Security & privacy

- **Payloads can appear on a lock screen** — don't put sensitive content in
  `title`/`body`.
- The **VAPID private key is server-only** and never reaches the client; the
  client receives only the public key (handled with the same care as
  `AUTH_SECRET` — `.env` only, never logged).
- Subscriptions are **per-user and ownership-checked** on delete, matching the
  file-ownership pattern in [file uploads](features.md#file-uploads).

## Related

- [Features → Web Push](features.md#web-push-notifications-optional)
- [PWA & App Shell](pwa.md) — the service worker this builds on
- [Spec 0015 — Web Push notifications](../specs/0015-web-push-notifications.md)
