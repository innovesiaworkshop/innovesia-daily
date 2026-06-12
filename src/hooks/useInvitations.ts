import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { todayISO } from '@/lib/dates'

export interface Invite {
  taskId: string
  name: string
  plannedFor: string | null
  startTime: string | null
  endTime: string | null
  organizer: string
}

interface RawRow {
  task_id: string
  task: {
    name: string
    planned_for: string | null
    start_time: string | null
    end_time: string | null
    pic: { name: string } | null
  } | null
}

// The signed-in user's PENDING meeting invitations for today + upcoming days.
export function useInvitations(): { invites: Invite[]; loading: boolean; refetch: () => Promise<void> } {
  const { profile } = useAuth()
  const uid = profile?.id
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!uid) return
    const { data } = await supabase
      .from('task_tags')
      .select(
        'task_id, task:tasks!inner(name, planned_for, start_time, end_time, ' +
          'pic:profiles!tasks_pic_id_fkey(name))',
      )
      .eq('user_id', uid)
      .eq('rsvp_status', 'pending')
      .eq('task.agenda_type', 'meeting')
      .gte('task.planned_for', todayISO())
    const rows = (data ?? []) as unknown as RawRow[]
    setInvites(
      rows
        .filter((r) => r.task)
        .map((r) => ({
          taskId: r.task_id,
          name: r.task!.name,
          plannedFor: r.task!.planned_for,
          startTime: r.task!.start_time,
          endTime: r.task!.end_time,
          organizer: r.task!.pic?.name || 'No name',
        })),
    )
    setLoading(false)
  }, [uid])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { invites, loading, refetch }
}
