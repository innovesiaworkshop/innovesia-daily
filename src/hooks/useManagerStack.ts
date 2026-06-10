import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { todayISO } from '@/lib/dates'
import type { StackItem } from '@/lib/types'

interface ManagerStackState {
  items: StackItem[]
  loading: boolean
  error: string | null
}

// Raw row shape from the query (before we split it into approval / overdue cards).
interface Row {
  id: string
  name: string
  project_id: string
  pic_id: string
  status: string
  approval_state: string
  due_date: string | null
  pic: { name: string } | null
  project: { name: string } | null
  files: { id: string; file_path: string; file_name: string }[]
}

// Builds the manager's "Kickstart Your Day" stack across all members: pending approvals first,
// then overdue agendas (derived: on_progress + past due, excluding the manager's own tasks).
export function useManagerStack(): ManagerStackState {
  const { profile } = useAuth()
  const uid = profile?.id
  const [state, setState] = useState<ManagerStackState>({ items: [], loading: true, error: null })

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, name, project_id, pic_id, status, approval_state, due_date, ' +
          'pic:profiles!tasks_pic_id_fkey(name), project:projects(name), ' +
          'files:task_files(id, file_path, file_name)',
      )
      .in('status', ['awaiting_approval', 'on_progress'])
      .order('created_at', { ascending: true })

    if (error) {
      setState({ items: [], loading: false, error: error.message })
      return
    }

    const rows = (data ?? []) as unknown as Row[]
    const today = todayISO()
    const toItem = (r: Row, kind: StackItem['kind']): StackItem => ({
      kind,
      id: r.id,
      name: r.name,
      project_id: r.project_id,
      pic_id: r.pic_id,
      due_date: r.due_date,
      pic: r.pic,
      project: r.project,
      files: r.files ?? [],
    })

    // Approvals first, then overdue (excluding the manager's own tasks).
    const approvals = rows
      .filter((r) => r.status === 'awaiting_approval' && r.approval_state === 'pending')
      .map((r) => toItem(r, 'approval'))
    const overdue = rows
      .filter(
        (r) =>
          r.status === 'on_progress' &&
          r.due_date != null &&
          r.due_date < today &&
          r.pic_id !== uid,
      )
      .map((r) => toItem(r, 'overdue'))

    setState({ items: [...approvals, ...overdue], loading: false, error: null })
  }, [uid])

  useEffect(() => {
    void fetchItems()

    const channel = supabase
      .channel('manager-stack')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () =>
        void fetchItems(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchItems])

  return state
}
