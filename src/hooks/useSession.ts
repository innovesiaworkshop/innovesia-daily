import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Tracks the current Supabase auth session and keeps it in sync with auth events.
// `loading` is true until the initial session has been resolved.
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
