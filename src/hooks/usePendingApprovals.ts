import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PendingApprovalTask } from '@/lib/types'

interface PendingApprovalsState {
  tasks: PendingApprovalTask[]
  loading: boolean
  error: string | null
}

// All members' tasks awaiting approval (RLS is permissive), with files embedded for the
// employer home approvals section. Kept live via Supabase realtime on tasks.
export function usePendingApprovals(): PendingApprovalsState {
  const [state, setState] = useState<PendingApprovalsState>({ tasks: [], loading: true, error: null })

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, name, project_id, pic_id, ' +
          'pic:profiles!tasks_pic_id_fkey(name), project:projects(name), ' +
          'files:task_files(id, file_path, file_name)',
      )
      .eq('status', 'awaiting_approval')
      .order('created_at', { ascending: true })

    if (error) {
      setState({ tasks: [], loading: false, error: error.message })
      return
    }
    setState({ tasks: (data ?? []) as unknown as PendingApprovalTask[], loading: false, error: null })
  }, [])

  useEffect(() => {
    void fetchTasks()

    const channel = supabase
      .channel('pending-approvals')
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
