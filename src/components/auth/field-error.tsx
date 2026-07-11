export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return (
    <p className="text-destructive text-sm" role="alert">
      {errors[0]}
    </p>
  )
}

export function FormMessage({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div
      className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
      role="alert"
    >
      {message}
    </div>
  )
}
