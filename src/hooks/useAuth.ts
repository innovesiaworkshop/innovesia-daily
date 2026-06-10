import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/lib/AuthContext'

// App-wide access to the current session, profile, and auth actions.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
