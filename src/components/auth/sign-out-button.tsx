import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth'

export function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server'
        await signOut({ redirectTo: '/login' })
      }}
    >
      <Button type="submit" variant="outline" size="sm">
        <LogOut />
        Sign out
      </Button>
    </form>
  )
}
