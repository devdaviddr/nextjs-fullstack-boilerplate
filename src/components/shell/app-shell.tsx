'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

import { SignOutButton } from '@/components/auth/sign-out-button'
import { SidebarNav } from '@/components/shell/sidebar-nav'
import { cn } from '@/lib/utils'

const BRAND = 'Boilerplate'

/**
 * Minimal, borderless app shell: a fixed sidebar on desktop that collapses to
 * an off-canvas drawer on mobile, plus a sticky topbar. Handles PWA safe-area
 * insets so nothing is obscured by a notch in standalone mode.
 */
export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null }
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = useState(pathname)

  // Close the drawer on navigation by adjusting state during render (the
  // React-recommended alternative to a setState-in-effect).
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="bg-muted/30 fixed inset-y-0 left-0 z-30 hidden w-60 flex-col px-3 pt-[calc(env(safe-area-inset-top)_+_1rem)] pb-[env(safe-area-inset-bottom)] md:flex">
        <div className="px-2 pb-4 text-lg font-semibold tracking-tight">
          {BRAND}
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'bg-background absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col px-3 pt-[calc(env(safe-area-inset-top)_+_1rem)] pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between px-2 pb-4">
            <span className="text-lg font-semibold tracking-tight">
              {BRAND}
            </span>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* Main column */}
      <div className="flex min-h-dvh flex-col md:pl-60">
        <header className="bg-background/80 sticky top-0 z-20 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="text-muted-foreground hover:text-foreground -ml-1 p-1 md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <span className="font-semibold md:hidden">{BRAND}</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-muted-foreground hidden max-w-[40vw] truncate text-sm sm:inline">
                {user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-[calc(env(safe-area-inset-bottom)_+_1.5rem)] sm:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
