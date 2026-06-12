import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isAllowedEmail } from '@/config/access'
import type { Profile, Role } from '@/lib/types'

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  /** True until the initial session (and profile, if signed in) has resolved. */
  loading: boolean
  /**
   * Employer-only, in-memory "view as" override for testing the employee/employer
   * experience without re-logging-in. null = use the real profile.role. Resets on
   * reload and never touches the DB or RLS (see CLAUDE.md).
   */
  viewAsRole: Role | null
  setViewAsRole: (role: Role | null) => void
  /** The role all role-gated UI should read: viewAsRole when set, else the real role. */
  effectiveRole: Role
  /** Set when a sign-in is rejected by the email allowlist (shown on the Login screen). */
  authError: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Failed to load profile:', error.message)
    return null
  }
  return data as Profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewAsRole, setViewAsRole] = useState<Role | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Allowlist gate: only sessions whose email is on the company domain or in the explicit
  // allowlist are kept; anyone else is signed out immediately. Returns the session if allowed,
  // otherwise null. (The Google consent screen is the primary gate; this backs it up in-app.)
  const enforceAllowed = useCallback(async (next: Session | null): Promise<Session | null> => {
    if (next && !isAllowedEmail(next.user.email)) {
      setAuthError('That account isn’t allowed. Use your Innovesia account.')
      await supabase.auth.signOut()
      return null
    }
    return next
  }, [])

  useEffect(() => {
    let active = true

    // Restore any persisted session on launch (persistSession/autoRefreshToken are
    // enabled on the client), then resolve the matching profile before we render.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const allowed = await enforceAllowed(data.session)
      setSession(allowed)
      if (allowed) setProfile(await fetchProfile(allowed.user.id))
      if (active) setLoading(false)
    })

    // React to sign-in / sign-out / token-refresh for the rest of the app lifetime.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return
      const allowed = await enforceAllowed(next)
      setSession(allowed)
      setProfile(allowed ? await fetchProfile(allowed.user.id) : null)
      // Drop any testing override on sign-out so it never carries across accounts.
      if (!allowed) setViewAsRole(null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [enforceAllowed])

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null) // clear any prior rejection on a fresh attempt
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  // viewAsRole only applies to employers; the effective role falls back to the real one.
  const effectiveRole: Role = viewAsRole ?? profile?.role ?? 'employee'

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        viewAsRole,
        setViewAsRole,
        effectiveRole,
        authError,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
