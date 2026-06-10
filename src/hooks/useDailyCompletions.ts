import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DailyCompletion } from '@/lib/types'

interface Member {
  id: string
  name: string
}

interface DailyCompletionsState {
  members: Member[]
  completions: DailyCompletion[]
  loading: boolean
  error: string | null
}

const WINDOW_DAYS = 14

// Loads all team members plus their completed agendas over the last 14 days (PIC + project
// embedded) for the manager Dashboard. Refetches on mount (i.e. each time the page opens).
export function useDailyCompletions(): DailyCompletionsState {
  const [state, setState] = useState<DailyCompletionsState>({
    members: [],
    completions: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true

    async function load() {
      const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
      const [membersRes, completionsRes] = await Promise.all([
        supabase.from('profiles').select('id, name').order('name'),
        supabase
          .from('tasks')
          .select(
            // disambiguated FK (tasks→profiles is ambiguous via pic_id + task_tags) → no PGRST201
            'id, name, completed_at, project:projects(name), pic:profiles!tasks_pic_id_fkey(id, name)',
          )
          .eq('status', 'done')
          .gte('completed_at', cutoff)
          .order('completed_at', { ascending: false }),
      ])

      if (!active) return
      if (membersRes.error || completionsRes.error) {
        setState((s) => ({ ...s, loading: false, error: 'Couldn’t load completions.' }))
        return
      }
      setState({
        members: (membersRes.data ?? []) as Member[],
        completions: (completionsRes.data ?? []) as unknown as DailyCompletion[],
        loading: false,
        error: null,
      })
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return state
}
