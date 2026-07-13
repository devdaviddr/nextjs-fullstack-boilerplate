/**
 * Shared form state for the auth server actions. Kept in its own module because
 * a `'use server'` file may only export async functions — not values/types.
 */
export type AuthFormState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: Record<string, string[]>
}

export const initialAuthState: AuthFormState = { status: 'idle' }
