import type { Metadata } from 'next'

import { LoginForm } from '@/components/auth/login-form'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { configuredOAuthProviders } from '@/lib/auth/providers'

export const metadata: Metadata = { title: 'Sign in' }

/**
 * Maps Auth.js OAuth error codes (delivered as `?error=…`) to a user-facing
 * message. `OAuthAccountNotLinked` is the important one: it means the OAuth
 * email matches an existing account and we deliberately do NOT auto-link
 * (see spec 0010 NFR1) — tell the user to sign in and link from Settings.
 */
function oauthErrorMessage(error?: string): string | null {
  if (!error) return null
  if (error === 'OAuthAccountNotLinked') {
    return 'An account with this email already exists. Sign in with your password first, then link this provider from Settings.'
  }
  return 'Sign-in with that provider failed. Please try again.'
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const providers = configuredOAuthProviders()
  const errorMessage = oauthErrorMessage(error)

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {errorMessage && (
          <p
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {errorMessage}
          </p>
        )}
        <LoginForm />
        <OAuthButtons providers={providers} />
      </CardContent>
    </Card>
  )
}
