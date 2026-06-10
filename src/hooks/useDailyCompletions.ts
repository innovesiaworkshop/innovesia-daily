import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DailyCompletion } from '@/lib/types'

interface Member {
  id: string
  name: string
}

// Donut counts: In Progress + Awaiting Approval are the live set; Done is last-14-days.
export interface StatusCounts {
  in_progress: number
  awaiting_approval: number
  done: number
}

interface DailyCompletionsState {
  members: Member[]
  completions: DailyCompletion[]
  statusCounts: StatusCounts
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
    statusCounts: { in_progress: 0, awaiting_approval: 0, done: 0 },
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true

    async function load() {
      const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
      const [membersRes, completionsRes, openRes] = await Promise.all([
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
        // Live (non-done) status counts for the donut.
        supabase.from('tasks').select('status').in('status', ['on_progress', 'awaiting_approval']),
      ])

      if (!active) return
      if (membersRes.error || completionsRes.error || openRes.error) {
        setState((s) => ({ ...s, loading: false, error: 'Couldn’t load dashboard data.' }))
        return
      }
      const completions = (completionsRes.data ?? []) as unknown as DailyCompletion[]
      const open = (openRes.data ?? []) as { status: string }[]
      setState({
        members: (membersRes.data ?? []) as Member[],
        completions,
        statusCounts: {
          in_progress: open.filter((t) => t.status === 'on_progress').length,
          awaiting_approval: open.filter((t) => t.status === 'awaiting_approval').length,
          done: completions.length,
        },
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
