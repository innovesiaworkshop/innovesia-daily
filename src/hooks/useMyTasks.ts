import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { TaskWithProject } from '@/lib/types'

interface MyTasksState {
  tasks: TaskWithProject[]
  loading: boolean
  error: string | null
}

interface MyTasksHook extends MyTasksState {
  /** Force a reload. Needed for DELETEs, which realtime can't match on a non-PK filter. */
  refetch: () => Promise<void>
}

// Loads the signed-in user's tasks (pic_id = me) joined with their project name, and
// keeps them live via Supabase realtime. `tasks` is already in the supabase_realtime
// publication; we refetch on any change since the change payload omits the join.
export function useMyTasks(): MyTasksHook {
  const { profile } = useAuth()
  const uid = profile?.id
  const [state, setState] = useState<MyTasksState>({ tasks: [], loading: true, error: null })

  const fetchTasks = useCallback(async () => {
    if (!uid) return
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, name, project_id, due_date, status, planned_for, completed_at, project:projects(name)',
      )
      .eq('pic_id', uid)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      setState({ tasks: [], loading: false, error: error.message })
      return
    }
    // `project:projects(name)` is a to-one embed (single object at runtime), but the
    // inferred type widens it to an array — cast through unknown to the real shape.
    setState({ tasks: (data ?? []) as unknown as TaskWithProject[], loading: false, error: null })
  }, [uid])

  useEffect(() => {
    if (!uid) return
    void fetchTasks()

    const channel = supabase
      .channel('my-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `pic_id=eq.${uid}` },
        () => void fetchTasks(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [uid, fetchTasks])

  return { ...state, refetch: fetchTasks }
}
