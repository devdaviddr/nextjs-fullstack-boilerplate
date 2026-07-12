import type { Metadata } from 'next'

import { RegisterForm } from '@/components/auth/register-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Create account' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; email?: string }>
}) {
  const { invite, email } = await searchParams
  const isInvite = !!invite

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {isInvite ? 'Claim your account' : 'Create your account'}
        </CardTitle>
        <CardDescription>
          {isInvite
            ? 'Set a password to activate your account'
            : 'Enter your details to get started'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm invite={invite} defaultEmail={email} />
      </CardContent>
    </Card>
  )
}
