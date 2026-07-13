'use client'

import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Camera, Loader2, X } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/auth/field-error'
import { removeProfilePhoto, uploadProfilePhoto } from '@/lib/storage/actions'

interface AvatarUploadProps {
  name: string | null
  image: string | null | undefined
}

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

/**
 * Upload/replace/remove the signed-in user's own profile photo. Reuses the
 * general file-storage Server Actions (spec 0007) via the avatar-specific
 * `uploadProfilePhoto`/`removeProfilePhoto` (spec 0018). After a successful
 * change, calls `update()` so the session (and everywhere it's read, e.g.
 * the app shell) reflects the new photo without a re-login.
 */
export function AvatarUpload({ name, image }: AvatarUploadProps) {
  const { update } = useSession()
  const [currentImage, setCurrentImage] = useState(image ?? null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const result = await uploadProfilePhoto(formData)
      if (!result.ok) {
        setError(result.error)
      } else {
        setCurrentImage(result.data.image)
        // `update()` with no argument is just a GET re-fetch of the current
        // session — it does NOT trigger the jwt callback's `trigger ===
        // 'update'` branch. Only a defined argument (even `{}`) makes the
        // client POST, which is what actually reruns jwt() server-side.
        await update({})
      }
    } catch {
      setError('Upload failed unexpectedly. Please try again.')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setError(null)
    setIsUploading(true)
    try {
      const result = await removeProfilePhoto()
      if (!result.ok) {
        setError(result.error)
      } else {
        setCurrentImage(null)
        await update({})
      }
    } catch {
      setError('Remove failed unexpectedly. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="size-16">
          {currentImage && (
            <AvatarImage src={currentImage} alt={name ?? 'Profile photo'} />
          )}
          {/* When an image is expected, hold the fallback back briefly so a
              fast (cached) load shows the photo directly instead of flashing
              initials first. With no image, show initials immediately. */}
          <AvatarFallback delayMs={currentImage ? 500 : 0} className="text-lg">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        {isUploading && (
          <div className="bg-background/70 absolute inset-0 flex items-center justify-center rounded-full">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <span className="sr-only">Uploading…</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            Change photo
          </Button>
          {currentImage && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isUploading}
              onClick={handleRemove}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        {error && <FormMessage message={error} />}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload profile photo"
      />
    </div>
  )
}
