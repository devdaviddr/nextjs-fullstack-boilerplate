import { oauthSignInAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

const PROVIDERS = {
  github: { label: 'GitHub', icon: GithubIcon },
  google: { label: 'Google', icon: GoogleIcon },
} as const

/**
 * Renders a "Continue with …" button for each configured OAuth provider. This
 * is a server component: the caller computes which providers are enabled from
 * env (`configuredOAuthProviders()`) and passes only their ids — the secrets
 * never reach the client. Each button submits a tiny form to the
 * `oauthSignInAction` server action.
 */
export function OAuthButtons({
  providers,
}: {
  providers: Array<'github' | 'google'>
}) {
  if (providers.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or continue with</span>
        <span className="bg-border h-px flex-1" />
      </div>
      {providers.map((id) => {
        const { label, icon: Icon } = PROVIDERS[id]
        return (
          <form key={id} action={oauthSignInAction}>
            <input type="hidden" name="provider" value={id} />
            <Button type="submit" variant="outline" className="w-full">
              <Icon />
              Continue with {label}
            </Button>
          </form>
        )
      })}
    </div>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.75.4-1.27.73-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.28 5.69.41.36.78 1.05.78 2.12v3.14c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.74Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.29a12 12 0 0 0 0 10.75l3.98-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  )
}
