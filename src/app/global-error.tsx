'use client'

/**
 * Root-level error boundary. Replaces the root layout when an error is thrown
 * in the layout itself, so it must render its own <html>/<body>. Kept fully
 * self-contained (inline styles, no imports) so it renders even if the app's
 * styling or component chunks are the thing that failed.
 *
 * Defining this explicitly also sidesteps a Next.js 16 + Turbopack dev bug
 * where the built-in global-error module is missing from the React client
 * manifest.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#fff',
          color: '#0f172a',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 420 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            An unexpected error occurred. Try again, and if it persists check
            the server logs.
          </p>
          {error.digest && (
            <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#0f172a',
              color: '#fff',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
