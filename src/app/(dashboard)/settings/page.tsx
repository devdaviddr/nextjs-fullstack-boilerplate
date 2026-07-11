import type { Metadata } from 'next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Example settings</CardTitle>
          <CardDescription>
            A placeholder page to demonstrate multi-route navigation inside the
            app shell.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Wire up account and application settings here.
        </CardContent>
      </Card>
    </div>
  )
}
