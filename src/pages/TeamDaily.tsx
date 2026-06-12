import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Badge, Card } from '@/components/ui'
import { MeetingBadge } from '@/components/MeetingBadge'
import { localDateISO, todayISO } from '@/lib/dates'
import type { AgendaType, TaskStatus } from '@/lib/types'

// Read-only glance for everyone: each teammate's agenda for one day. Tap a row to open it.
type Tone = 'info' | 'pending' | 'success'
const STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  on_progress: { label: 'In Progress', tone: 'info' },
  awaiting_approval: { label: 'Awaiting', tone: 'pending' },
  done: { label: 'Done', tone: 'success' },
}

interface TaskRow {
  id: string
  name: string
  status: TaskStatus
  agenda_type: AgendaType
  start_time: string | null
  end_time: string | null
}

// One task placed under one person (the PIC, or an accepted meeting attendee).
interface Entry {
  personId: string
  personName: string
  task: TaskRow
}

const TASK_COLS = 'id, name, status, agenda_type, start_time, end_time'

const dateLabelFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

function labelFor(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return dateLabelFmt.format(new Date(y, m - 1, d))
}

function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return localDateISO(dt)
}

export function TeamDaily() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [date, setDate] = useState(todayISO())
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    // A person's day = their own tasks (PIC) + meetings they've accepted an invite to.
    Promise.all([
      supabase
        .from('tasks')
        .select(`${TASK_COLS}, pic_id, pic:profiles!tasks_pic_id_fkey(id, name)`)
        .eq('planned_for', date),
      supabase
        .from('task_tags')
        .select(`user:profiles!task_tags_user_id_fkey(id, name), task:tasks!inner(${TASK_COLS})`)
        .eq('rsvp_status', 'accepted')
        .eq('task.agenda_type', 'meeting')
        .eq('task.planned_for', date),
    ]).then(([baseRes, invRes]) => {
      if (!active) return
      if (baseRes.error || invRes.error) {
        setError('Couldn’t load the team agenda. Try again.')
        setLoading(false)
        return
      }
      const base = (baseRes.data ?? []) as unknown as (TaskRow & {
        pic_id: string
        pic: { id: string; name: string } | null
      })[]
      const inv = (invRes.data ?? []) as unknown as {
        user: { id: string; name: string } | null
        task: TaskRow | null
      }[]
      const baseEntries: Entry[] = base.map((r) => ({
        personId: r.pic_id,
        personName: r.pic?.name || 'No name',
        task: r,
      }))
      const invEntries: Entry[] = inv
        .filter((r) => r.user && r.task)
        .map((r) => ({ personId: r.user!.id, personName: r.user!.name || 'No name', task: r.task! }))
      setEntries([...baseEntries, ...invEntries])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [date])

  // Group by person (own group pinned on top), de-duping a meeting that lands on a person
  // via both PIC and an accepted invite.
  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; tasks: TaskRow[]; seen: Set<string> }>()
    for (const e of entries) {
      const g = map.get(e.personId) ?? { id: e.personId, name: e.personName, tasks: [], seen: new Set() }
      if (!g.seen.has(e.task.id)) {
        g.tasks.push(e.task)
        g.seen.add(e.task.id)
      }
      map.set(e.personId, g)
    }
    return [...map.values()].sort((a, b) => {
      if (a.id === profile?.id) return -1
      if (b.id === profile?.id) return 1
      return a.name.localeCompare(b.name)
    })
  }, [entries, profile?.id])

  const isToday = date === todayISO()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Team Day</h2>
        <p className="text-sm text-slate-500">Everyone’s planned agenda for a day.</p>
      </div>

      {/* Date pill with prev/next — pinned to the top while the day's list scrolls. */}
      <div className="sticky top-2 z-10 flex items-center justify-between gap-2 rounded-full border border-white/50 bg-white/60 p-1.5 shadow-glass backdrop-blur-md">
        <button
          type="button"
          onClick={() => setDate((d) => shiftISO(d, -1))}
          aria-label="Previous day"
          className="grid h-9 w-9 place-items-center rounded-full text-slate-600 active:bg-white/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <span className="text-sm font-semibold text-slate-800">{labelFor(date)}</span>
          {isToday && <span className="ml-1.5 text-xs font-medium text-sky">Today</span>}
        </div>
        <button
          type="button"
          onClick={() => setDate((d) => shiftISO(d, 1))}
          aria-label="Next day"
          className="grid h-9 w-9 place-items-center rounded-full text-slate-600 active:bg-white/60"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading && <p className="pt-6 text-center text-sm text-slate-400">Loading…</p>}
      {error && <p className="pt-6 text-center text-sm text-red-600">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-2 text-center text-slate-400">
            <Users className="h-6 w-6" />
            <p className="text-sm">No agenda planned for this day.</p>
          </div>
        </Card>
      )}

      {!loading &&
        !error &&
        groups.map((g) => (
          <section key={g.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{g.name}</h3>
              {g.id === profile?.id && <span className="text-xs font-medium text-sky">You</span>}
              <Badge tone="neutral">{g.tasks.length}</Badge>
            </div>
            <Card className="divide-y divide-white/40">
              {g.tasks.map((t) => {
                const s = STATUS[t.status]
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/tugas/${t.id}`)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition active:bg-white/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{t.name}</span>
                      <MeetingBadge
                        agendaType={t.agenda_type}
                        startTime={t.start_time}
                        endTime={t.end_time}
                        className="mt-1"
                      />
                    </span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </button>
                )
              })}
            </Card>
          </section>
        ))}
    </div>
  )
}
