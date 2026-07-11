'use client'

import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signOutAction } from '@/lib/auth/actions'

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  )
}
