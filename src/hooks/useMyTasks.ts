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

const TASK_FIELDS =
  'id, name, project_id, pic_id, due_date, status, approval_state, revision_note, ' +
  'planned_for, completed_at, agenda_type, start_time, end_time, project:projects(name)'

// Loads the signed-in user's tasks (pic_id = me) joined with their project name, and
// keeps them live via Supabase realtime. `tasks` is already in the supabase_realtime
// publication; we refetch on any change since the change payload omits the join.
export function useMyTasks(): MyTasksHook {
  const { profile } = useAuth()
  const uid = profile?.id
  const [state, setState] = useState<MyTasksState>({ tasks: [], loading: true, error: null })

  const fetchTasks = useCallback(async () => {
    if (!uid) return
    // A person's day = their own tasks OR meetings they've accepted an invite to.
    const [mineRes, invRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(TASK_FIELDS)
        .eq('pic_id', uid)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('task_tags')
        .select(`task:tasks!inner(${TASK_FIELDS})`)
        .eq('user_id', uid)
        .eq('rsvp_status', 'accepted')
        .eq('task.agenda_type', 'meeting'),
    ])

    if (mineRes.error) {
      setState({ tasks: [], loading: false, error: mineRes.error.message })
      return
    }
    const mine = (mineRes.data ?? []) as unknown as TaskWithProject[]
    const accepted = ((invRes.data ?? []) as unknown as { task: TaskWithProject | null }[])
      .map((r) => r.task)
      .filter((t): t is TaskWithProject => !!t)

    // Merge, de-duping by id (an accepted meeting I also own can't happen, but be safe).
    const byId = new Map<string, TaskWithProject>()
    for (const t of [...mine, ...accepted]) byId.set(t.id, t)
    setState({ tasks: [...byId.values()], loading: false, error: null })
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
