import type { Metadata } from 'next'
import Link from 'next/link'

import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Reset password' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await searchParams

  if (!token || !email) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Invalid reset link</CardTitle>
          <CardDescription>
            This link is missing information. Request a new one from{' '}
            <Link href="/forgot-password" className="text-foreground underline">
              forgot password
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Enter and confirm your new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm email={email} token={token} />
      </CardContent>
    </Card>
  )
}
