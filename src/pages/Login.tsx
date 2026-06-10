import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

// Google icon (multicolor "G"), kept inline to avoid an asset/dependency.
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M3.3 14.7l6.6 4.8C11.6 15.1 17.4 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 16 2 9.1 6.5 5.5 13.1l-2.2 1.6z" />
      <path fill="#4CAF50" d="M24 46c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 36.4 27 37.5 24 37.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.7 41.4 16.3 46 24 46z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.9 36 46 30.6 46 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

export function Login() {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
      // On success the browser redirects to Google, so we stay "busy".
    } catch {
      setError('Sign-in failed. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center bg-white px-6 text-center">
      <div className="mb-10">
        <img src="/favicon.svg" alt="Innovesia Daily" className="mx-auto mb-5 h-20 w-20" />
        <h1 className="text-2xl font-semibold text-navy">Innovesia Daily</h1>
        <p className="mt-2 text-sm text-slate-500">Log your daily tasks in seconds.</p>
      </div>

      <button
        type="button"
        onClick={handleSignIn}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-navy px-5 py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
          <GoogleIcon className="h-4 w-4" />
        </span>
        {busy ? 'Redirecting…' : 'Sign in with Google'}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  )
}
