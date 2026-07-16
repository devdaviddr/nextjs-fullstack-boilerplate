import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Package } from 'lucide-react'

interface BuildInfoCardProps {
  /** Baked-in build identity (from env.APP_VERSION / env.APP_GIT_SHA). */
  version?: string
  sha?: string
}

/**
 * Shows which build this instance is running — the version + short commit baked
 * into the image at CI build time. Lets an operator confirm what a self-hosted
 * box picked up after an unattended pull (see spec 0023). Degrades to a
 * "development build" note when the metadata is absent (`next dev`, un-baked
 * local image).
 */
export function BuildInfoCard({ version, sha }: BuildInfoCardProps) {
  const shortSha = sha?.slice(0, 7)
  const isBaked = Boolean(version || sha)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Build
        </CardTitle>
        <CardDescription>
          The version this instance is currently running
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isBaked ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm font-medium">
                Version
              </Label>
              <p>{version ?? '—'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm font-medium">
                Commit
              </Label>
              {shortSha ? (
                <code className="bg-muted rounded px-2 py-1 text-xs">
                  {shortSha}
                </code>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Development build — version and commit are baked in at CI build
            time.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
