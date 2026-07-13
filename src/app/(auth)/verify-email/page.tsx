import type { Metadata } from 'next'
import Link from 'next/link'

import { confirmEmailToken } from '@/lib/auth/email-verification'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Verify email' }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await searchParams
  // Email links are GET, so verification happens on load. The token is
  // single-use and purpose-scoped, so this can't be abused by crawling.
  const ok = token && email ? await confirmEmailToken(email, token) : false

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {ok ? 'Email verified' : 'Verification failed'}
        </CardTitle>
        <CardDescription>
          {ok
            ? 'Your email address has been confirmed. Thanks!'
            : 'This verification link is invalid or has expired. Sign in and request a new one from Settings.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Link href="/login" className="text-foreground text-sm underline">
          Continue to sign in
        </Link>
      </CardContent>
    </Card>
  )
}
