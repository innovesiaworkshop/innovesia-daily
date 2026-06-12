import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useGoBack } from '@/hooks/useGoBack'
import { useDelegate } from '@/hooks/useDelegate'
import { Badge, Card, FloatingControlBar } from '@/components/ui'
import { todayISO } from '@/lib/dates'
import type { LayoutOutletContext } from '@/components/Layout'
import type { TaskStatus } from '@/lib/types'

type Tone = 'info' | 'pending' | 'success'
const STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  on_progress: { label: 'In Progress', tone: 'info' },
  awaiting_approval: { label: 'Awaiting', tone: 'pending' },
  done: { label: 'Done', tone: 'success' },
}

const dueFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
function formatDue(iso: string | null): string | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return dueFmt.format(new Date(y, m - 1, d))
}

interface Row {
  id: string
  name: string
  status: TaskStatus
  planned_for: string | null
  due_date: string | null
  project: { name: string } | null
}

// Rafina's PA board: manage Pak Bagus's agenda in one place. Delegate-only.
export function PaBagus() {
  const { isAssistant, target } = useDelegate()
  const navigate = useNavigate()
  const goBack = useGoBack()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drive the shared header (title only; back lives in the bar below, like the detail pages).
  const { setHeader } = useOutletContext<LayoutOutletContext>()
  useEffect(() => {
    setHeader({ title: target.label, onBack: null })
    return () => setHeader({ title: null, onBack: null })
  }, [setHeader, target.label])

  useEffect(() => {
    if (!isAssistant) return
    let active = true
    setLoading(true)
    setError(null)
    supabase
      .from('tasks')
      .select('id, name, status, planned_for, due_date, project:projects(name)')
      .eq('pic_id', target.id)
      .neq('status', 'done')
      .order('planned_for', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError('Couldn’t load his agenda. Try again.')
        else setRows((data ?? []) as unknown as Row[])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isAssistant, target.id])

  const today = todayISO()
  const { awaiting, todayTasks, upcoming } = useMemo(() => {
    const awaiting = rows.filter((r) => r.status === 'awaiting_approval')
    const onProgress = rows.filter((r) => r.status === 'on_progress')
    const todayTasks = onProgress.filter((r) => r.planned_for != null && r.planned_for <= today)
    const upcoming = onProgress.filter((r) => r.planned_for == null || r.planned_for > today)
    return { awaiting, todayTasks, upcoming }
  }, [rows, today])

  // Direct-URL guard for non-delegates (the Home card is the only entry point).
  if (!isAssistant) return <Navigate to="/" replace />

  const isEmpty = !loading && !error && rows.length === 0

  function Section({ label, items }: { label: string; items: Row[] }) {
    if (items.length === 0) return null
    return (
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{label}</h3>
          <Badge tone="neutral">{items.length}</Badge>
        </div>
        <Card className="divide-y divide-white/40">
          {items.map((t) => {
            const s = STATUS[t.status]
            const due = formatDue(t.due_date)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/tugas/${t.id}`)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition active:bg-white/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800">{t.name}</span>
                  <span className="block truncate text-xs text-sky">
                    {t.project?.name ?? 'No project'}
                    {due ? ` · Due ${due}` : ''}
                  </span>
                </span>
                <Badge tone={s.tone}>{s.label}</Badge>
              </button>
            )
          })}
        </Card>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <FloatingControlBar
        left={
          <button type="button" onClick={goBack} className="px-2 py-1 text-sm font-medium text-sky">
            ← Back
          </button>
        }
        right={
          <button
            type="button"
            onClick={() => navigate('/tambah', { state: { presetForTarget: 'bagus' } })}
            className="flex items-center gap-1 rounded-full bg-navy px-3.5 py-1.5 text-sm font-semibold text-white shadow-pill transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Agenda
          </button>
        }
      />

      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{target.label}</h2>
        <p className="text-sm text-slate-500">Manage his agenda — add, schedule, and edit.</p>
      </div>

      {loading && <p className="pt-6 text-center text-sm text-slate-400">Loading…</p>}
      {error && <p className="pt-6 text-center text-sm text-red-600">{error}</p>}

      {isEmpty && (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-2 text-center text-slate-400">
            <Users className="h-6 w-6" />
            <p className="text-sm">No open agenda for {target.label} yet.</p>
          </div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <Section label="Waiting for approval" items={awaiting} />
          <Section label="Today" items={todayTasks} />
          <Section label="Upcoming" items={upcoming} />
        </>
      )}
    </div>
  )
}
