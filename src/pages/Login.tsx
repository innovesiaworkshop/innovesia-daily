import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { theme } from '@/config/theme.registry'
import { loginBranding } from '@/config/branding'

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

// Brand wash over the login photo (tune 0.15–0.25).
const TINT_OPACITY = 0.2

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
    <div className="relative mx-auto flex h-full max-w-md flex-col overflow-hidden bg-cloud">
      {/* Full-bleed background photo. */}
      <img
        src={theme.assets.loginBackground}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Brand wash to shift the photo's colour a touch. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-navy to-sky"
        style={{ opacity: TINT_OPACITY }}
      />
      {/* Light scrim from the top so the dark logo / navy wordmark / button stay legible. */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/55 to-white/10" />

      <div className="relative z-10 flex flex-1 flex-col px-7 pt-[calc(env(safe-area-inset-top)+4rem)]">
        <h1 className="text-5xl font-extrabold leading-[1.04] tracking-tight text-navy">
          {(() => {
            const title = loginBranding(theme)
            return title.kind === 'wordmark' ? (
              <>
                {title.lead}
                <br />
                {/* Accent stored lowercase canonically; capitalize it in the hero. */}
                <span className="font-light italic capitalize">{title.accent}</span>
              </>
            ) : (
              title.text
            )
          })()}
        </h1>
        <p className="mt-3 text-sm font-medium text-slate-600">
          Log your daily agenda in seconds.
        </p>

        {/* Sign-in grouped directly under the subtitle, as part of the top block. */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-white/60 bg-white/90 px-5 py-3.5 text-base font-semibold text-slate-800 shadow-glass backdrop-blur transition active:scale-[0.99] disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            {busy ? 'Redirecting…' : 'Sign in with Google'}
          </button>
          {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
