import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// A trimmed task row — only the columns the capacity maths needs. created_at / completed_at
// are timestamptz strings; due_date is a YYYY-MM-DD date string (or null).
export interface CapacityTask {
  id: string
  pic_id: string
  status: 'awaiting_approval' | 'on_progress' | 'done'
  created_at: string
  completed_at: string | null
  due_date: string | null
}

export interface CapacityMember {
  id: string
  name: string
}

interface CapacityState {
  members: CapacityMember[]
  tasks: CapacityTask[]
  loading: boolean
  error: string | null
}

// Loads every team member plus the FULL task history (6 columns only) for the manager
// capacity view. We need all tasks — not a time window — because the backlog / overdue
// trends reconstruct "what was open on date S" from created_at/completed_at, which depends
// on still-open older rows. The payload is tiny for our team size; bound it by created_at
// later if the table ever grows large. Refetches on mount (each time the page opens).
export function useCapacityData(): CapacityState {
  const [state, setState] = useState<CapacityState>({
    members: [],
    tasks: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true

    async function load() {
      const [membersRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('id, name').order('name'),
        supabase.from('tasks').select('id, pic_id, status, created_at, completed_at, due_date'),
      ])

      if (!active) return
      if (membersRes.error || tasksRes.error) {
        setState((s) => ({ ...s, loading: false, error: 'Couldn’t load capacity data.' }))
        return
      }
      setState({
        members: (membersRes.data ?? []) as CapacityMember[],
        tasks: (tasksRes.data ?? []) as CapacityTask[],
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
