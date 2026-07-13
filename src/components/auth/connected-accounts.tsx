'use client'

import { Link2, Link2Off } from 'lucide-react'
import { useActionState } from 'react'

import {
  linkProviderAction,
  unlinkProviderAction,
  type LinkedAccountsState,
  type OAuthProvider,
} from '@/lib/auth/account-actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const LABELS: Record<OAuthProvider, string> = {
  github: 'GitHub',
  google: 'Google',
}

/**
 * "Connected accounts" panel: link/unlink OAuth providers for the signed-in
 * user. Only rendered when the deployment has at least one provider configured
 * (the parent passes `configured`). The unlink guard is enforced server-side;
 * this UI surfaces its error message.
 */
export function ConnectedAccounts({ state }: { state: LinkedAccountsState }) {
  if (state.configured.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Connected accounts
        </CardTitle>
        <CardDescription>
          Link a provider to sign in with it, or unlink one you no longer use.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.configured.map((provider) => (
          <ProviderRow
            key={provider}
            provider={provider}
            linked={state.linked.includes(provider)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function ProviderRow({
  provider,
  linked,
}: {
  provider: OAuthProvider
  linked: boolean
}) {
  const [unlinkState, unlink] = useActionState(unlinkProviderAction, null)

  return (
    <div className="flex items-center justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <p className="font-medium">{LABELS[provider]}</p>
        <p className="text-muted-foreground text-sm">
          {linked ? 'Connected' : 'Not connected'}
        </p>
        {unlinkState && !unlinkState.ok && (
          <p role="alert" className="text-destructive text-sm">
            {unlinkState.error}
          </p>
        )}
      </div>
      {linked ? (
        <form action={unlink}>
          <input type="hidden" name="provider" value={provider} />
          <Button type="submit" variant="outline" size="sm">
            <Link2Off />
            Unlink
          </Button>
        </form>
      ) : (
        <form action={linkProviderAction}>
          <input type="hidden" name="provider" value={provider} />
          <Button type="submit" variant="outline" size="sm">
            <Link2 />
            Link
          </Button>
        </form>
      )}
    </div>
  )
}
