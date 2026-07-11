'use client'

import { useFormStatus } from 'react-dom'
import { LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <LoaderCircle className="animate-spin" />}
      {children}
    </Button>
  )
}
