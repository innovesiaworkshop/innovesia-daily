import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDailyCompletions } from '@/hooks/useDailyCompletions'
import { useCapacityData } from '@/hooks/useCapacityData'
import { DashboardCharts } from '@/components/DashboardCharts'
import { CapacityCharts } from '@/components/CapacityCharts'
import { ScopeSelector } from '@/components/ScopeSelector'
import { Badge, Card } from '@/components/ui'
import { localDateISO } from '@/lib/dates'
import type { DailyCompletion } from '@/lib/types'

// Status donut needs a 14-day "done" window, scoped to match the rest of the dashboard.
const DONE_WINDOW_DAYS = 14

const dayHeader = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

// Parse a YYYY-MM-DD as a LOCAL calendar date (avoid UTC shifting the weekday).
function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface DayGroup {
  date: string
  tasks: DailyCompletion[]
}

// Group a member's completions by local day, newest day first (tasks stay desc from the query).
function groupByDay(items: DailyCompletion[]): DayGroup[] {
  const map = new Map<string, DailyCompletion[]>()
  for (const c of items) {
    const day = localDateISO(c.completed_at)
    const arr = map.get(day) ?? []
    arr.push(c)
    map.set(day, arr)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, tasks]) => ({ date, tasks }))
}

export function Dashboard() {
  const { effectiveRole } = useAuth()
  const { members, completions, loading, error } = useDailyCompletions()
  const capacity = useCapacityData()

  // One scope drives the WHOLE dashboard — capacity charts and Daily Completions alike.
  const [scope, setScope] = useState('all')
  const scopeOptions = useMemo(
    () => [
      { id: 'all', label: 'All team' },
      ...capacity.members.map((m) => ({ id: m.id, label: m.name || 'No name' })),
    ],
    [capacity.members],
  )

  const scopedCompletions = useMemo(
    () => (scope === 'all' ? completions : completions.filter((c) => c.pic?.id === scope)),
    [scope, completions],
  )

  // Donut counts, scoped from the capacity task set (live open + done-in-window).
  const scopedStatusCounts = useMemo(() => {
    const cutoff = Date.now() - DONE_WINDOW_DAYS * 86_400_000
    const ts = scope === 'all' ? capacity.tasks : capacity.tasks.filter((t) => t.pic_id === scope)
    return {
      in_progress: ts.filter((t) => t.status === 'on_progress').length,
      awaiting_approval: ts.filter((t) => t.status === 'awaiting_approval').length,
      done: ts.filter((t) => t.completed_at != null && new Date(t.completed_at).getTime() >= cutoff).length,
    }
  }, [scope, capacity.tasks])

  const byMember = useMemo(() => {
    const visible = scope === 'all' ? members : members.filter((m) => m.id === scope)
    return visible.map((m) => ({
      member: m,
      days: groupByDay(scopedCompletions.filter((c) => c.pic?.id === m.id)),
    }))
  }, [scope, members, scopedCompletions])

  // Gate on the effective role so the Manager/Employee switcher controls access.
  if (effectiveRole !== 'employer') {
    return (
      <p className="pt-10 text-center text-sm text-slate-500">This page is for managers only.</p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team capacity — throughput/backlog framed as LOAD (not a ranking). */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Team Capacity</h2>
        <p className="text-sm text-slate-500">Are we over capacity? Throughput vs backlog, by pace.</p>
      </div>

      {/* One scope selector at the very top — drives every chart below, Daily Completions too. */}
      <ScopeSelector options={scopeOptions} value={scope} onChange={setScope} />

      {capacity.loading && <p className="pt-2 text-center text-sm text-slate-400">Loading…</p>}
      {capacity.error && <p className="pt-2 text-center text-sm text-red-600">{capacity.error}</p>}
      {!capacity.loading && !capacity.error && (
        <CapacityCharts members={capacity.members} tasks={capacity.tasks} scope={scope} />
      )}

      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Daily Completions</h2>
        <p className="text-sm text-slate-500">Last 14 days</p>
      </div>

      {loading && <p className="pt-6 text-center text-sm text-slate-400">Loading…</p>}
      {error && <p className="pt-6 text-center text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <DashboardCharts completions={scopedCompletions} statusCounts={scopedStatusCounts} />
      )}

      {!loading &&
        !error &&
        byMember.map(({ member, days }) => (
          <section key={member.id} className="space-y-3">
            <h3 className="text-[17px] font-bold tracking-tight text-slate-900">
              {member.name || 'No name'}
            </h3>

            {days.length === 0 ? (
              <p className="text-sm text-slate-400">No completions yet.</p>
            ) : (
              days.map((day) => (
                <div key={day.date} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {dayHeader.format(localDate(day.date))}
                    </span>
                    <Badge tone="neutral">{day.tasks.length}</Badge>
                  </div>
                  <Card className="divide-y divide-white/40">
                    {day.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-start justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                          <p className="truncate text-xs text-sky">
                            {t.project?.name ?? 'No project'}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-500">
                          {timeFmt.format(new Date(t.completed_at))}
                        </span>
                      </div>
                    ))}
                  </Card>
                </div>
              ))
            )}
          </section>
        ))}
    </div>
  )
}
