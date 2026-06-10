import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isOverdue } from '@/lib/dates'
import type { ActionTask } from '@/lib/types'

interface PerluTindakanState {
  tasks: ActionTask[]
  loading: boolean
  error: string | null
}

// Loads everything awaiting the employer's action — tasks awaiting approval plus
// derived-overdue tasks — across ALL members (RLS is permissive), kept live via realtime.
// awaiting_approval (not raw approval_state) is used so approved/revised originals drop out
// of the queue once their status changes.
export function usePerluTindakan(): PerluTindakanState {
  const [state, setState] = useState<PerluTindakanState>({ tasks: [], loading: true, error: null })

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, name, project_id, pic_id, due_date, status, approval_state, ' +
          'pic:profiles!tasks_pic_id_fkey(name), project:projects(name)',
      )
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      setState({ tasks: [], loading: false, error: error.message })
      return
    }
    const all = (data ?? []) as unknown as ActionTask[]
    const needsAction = all.filter((t) => t.status === 'awaiting_approval' || isOverdue(t))
    setState({ tasks: needsAction, loading: false, error: null })
  }, [])

  useEffect(() => {
    void fetchTasks()

    const channel = supabase
      .channel('perlu-tindakan')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () =>
        void fetchTasks(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchTasks])

  return state
}
