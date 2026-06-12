import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui'
import { theme } from '@/config/theme.registry'
import { todayISO } from '@/lib/dates'
import type { CapacityMember, CapacityTask } from '@/hooks/useCapacityData'

// ─── Tunable constants (single source of truth; not hard limits) ──────────────
const INTAKE_WEEKS = 12 // intake-vs-throughput history length
const BACKLOG_WEEKS = 12 // open-backlog snapshot history length
const CYCLE_WEEKS = 10 // cycle-time history length
const OVERDUE_WEEKS = 10 // overdue-trend history length
const THROUGHPUT_WEEKS = 8 // per-person trailing window for avg completions/week
const CAPACITY_AMBER_WEEKS = 2 // weeks-of-backlog past which a person is tinted amber
const CAPACITY_RED_WEEKS = 4 // …and past which they're tinted red
const RECENT_WEEKS = 4 // window for the "growing vs keeping pace" verdict (intake vs throughput)
const AGING_THRESHOLD_DAYS = 14 // open tasks older than this (today − created_at) count as "stale"/aging
const AGE_BUCKETS = [7, 14, 30] as const // day edges → ≤7d · 8–14d · 15–30d · >30d
// ──────────────────────────────────────────────────────────────────────────────

// Brand palette (recharts needs values, not classes). Status colours stay gold/sky/navy;
// amber/red are reserved for capacity highlights only. No green anywhere.
const NAVY = theme.colors.primary
const SKY = theme.colors.accent
const SLATE = '#64748b'
const AMBER = '#d97706'
const RED = '#dc2626'

const MS_DAY = 86_400_000
const MS_WEEK = 7 * MS_DAY

const weekLabelFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

// Monday 00:00 (local) of the week containing `d`.
function weekStart(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const mondayOffset = (x.getDay() + 6) % 7 // Sun→6, Mon→0 …
  x.setDate(x.getDate() - mondayOffset)
  return x
}

interface WeekBucket {
  startMs: number
  endMs: number
  label: string
}

// The last `n` Monday-anchored week buckets, oldest → newest.
function lastWeeks(n: number): WeekBucket[] {
  const thisMonday = weekStart(new Date()).getTime()
  const out: WeekBucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const startMs = thisMonday - i * MS_WEEK
    out.push({ startMs, endMs: startMs + MS_WEEK, label: weekLabelFmt.format(new Date(startMs)) })
  }
  return out
}

// A task is OPEN at instant S iff it existed by then and wasn't yet completed.
function openAt(t: CapacityTask, s: number): boolean {
  return new Date(t.created_at).getTime() <= s && (t.completed_at == null || new Date(t.completed_at).getTime() > s)
}

// Local-midnight ms of a YYYY-MM-DD date string.
function dateMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

// Age in whole days of an open task (today − created_at). Due dates are irrelevant here —
// this is how aging catches lingering no-due-date work that "overdue" can never see.
function ageDays(t: CapacityTask, now: number): number {
  return Math.floor((now - new Date(t.created_at).getTime()) / MS_DAY)
}

interface PersonCapacity {
  id: string
  name: string
  throughput: number // avg completed / week over the trailing window
  openLoad: number // open tasks assigned now
  overdue: number // has a due_date, it's passed, not done
  aging: number // open tasks older than AGING_THRESHOLD_DAYS (no due date needed)
  weeksOfBacklog: number | null // null = can't estimate (no recent completions)
  sortKey: number
}

function ChartCard({
  title,
  subtitle,
  height,
  children,
}: {
  title: string
  subtitle?: string
  height: number
  children: React.ReactElement
}) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {subtitle && <p className="mb-2 text-xs text-slate-400">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-2'}>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function CapacityCharts({
  members,
  tasks,
  scope,
}: {
  members: CapacityMember[]
  tasks: CapacityTask[]
  scope: string // 'all' or a member id — owned by the Dashboard so it also scopes Daily Completions
}) {
  const today = todayISO()

  // Every chart + the summary recomputes from the scoped slice.
  const scopedTasks = useMemo(
    () => (scope === 'all' ? tasks : tasks.filter((t) => t.pic_id === scope)),
    [scope, tasks],
  )
  const scopeLabel = scope === 'all' ? 'The team' : members.find((m) => m.id === scope)?.name || 'This person'

  // 1) Intake vs throughput — created vs completed per week.
  const intakeThroughput = useMemo(() => {
    return lastWeeks(INTAKE_WEEKS).map(({ startMs, endMs, label }) => {
      let intake = 0
      let throughput = 0
      for (const t of scopedTasks) {
        const created = new Date(t.created_at).getTime()
        if (created >= startMs && created < endMs) intake++
        if (t.completed_at != null) {
          const done = new Date(t.completed_at).getTime()
          if (done >= startMs && done < endMs) throughput++
        }
      }
      return { label, intake, throughput }
    })
  }, [scopedTasks])

  // 2) Backlog trend — open count snapshot at each week boundary + the live count.
  const { backlogTrend, currentOpen } = useMemo(() => {
    const trend = lastWeeks(BACKLOG_WEEKS).map(({ endMs, label }) => ({
      label,
      open: scopedTasks.reduce((n, t) => n + (openAt(t, endMs) ? 1 : 0), 0),
    }))
    const open = scopedTasks.filter((t) => t.status !== 'done').length
    return { backlogTrend: trend, currentOpen: open }
  }, [scopedTasks])

  // 3) Open work by age — current open tasks bucketed by age, + the stale count. Independent
  // of due dates, so it surfaces lingering no-due-date work that "overdue" misses.
  const { ageDistribution, staleCount } = useMemo(() => {
    const now = Date.now()
    const open = scopedTasks.filter((t) => t.status !== 'done')
    const row = { name: 'Open', le7: 0, le14: 0, le30: 0, gt30: 0 }
    for (const t of open) {
      const a = ageDays(t, now)
      if (a <= AGE_BUCKETS[0]) row.le7++
      else if (a <= AGE_BUCKETS[1]) row.le14++
      else if (a <= AGE_BUCKETS[2]) row.le30++
      else row.gt30++
    }
    const stale = open.filter((t) => ageDays(t, now) > AGING_THRESHOLD_DAYS).length
    return { ageDistribution: [row], staleCount: stale }
  }, [scopedTasks])

  // 4) Cycle-time trend — avg days created→completed, by completion week.
  const cycleTrend = useMemo(() => {
    return lastWeeks(CYCLE_WEEKS).map(({ startMs, endMs, label }) => {
      let sum = 0
      let count = 0
      for (const t of scopedTasks) {
        if (t.completed_at == null) continue
        const done = new Date(t.completed_at).getTime()
        if (done < startMs || done >= endMs) continue
        sum += (done - new Date(t.created_at).getTime()) / MS_DAY
        count++
      }
      return { label, days: count > 0 ? Number((sum / count).toFixed(1)) : null }
    })
  }, [scopedTasks])

  // 5) Overdue trend — overdue-AND-open task count at each week boundary. Requires a due_date
  // (you can't miss a deadline that doesn't exist); no-due-date work is covered by aging above.
  const overdueTrend = useMemo(() => {
    return lastWeeks(OVERDUE_WEEKS).map(({ endMs, label }) => ({
      label,
      overdue: scopedTasks.reduce(
        (n, t) => n + (t.due_date != null && dateMs(t.due_date) < endMs && openAt(t, endMs) ? 1 : 0),
        0,
      ),
    }))
  }, [scopedTasks])

  // Glanceable summary for the scope: the verdict + the headline tiles.
  const summary = useMemo(() => {
    const now = Date.now()
    const windowStart = now - THROUGHPUT_WEEKS * MS_WEEK

    const firstMs = scopedTasks.reduce<number | null>((min, t) => {
      const c = new Date(t.created_at).getTime()
      return min == null || c < min ? c : min
    }, null)
    const historyWeeks = firstMs == null ? 0 : (now - firstMs) / MS_WEEK
    const weeksAvailable = Math.min(THROUGHPUT_WEEKS, Math.max(1, Math.ceil(historyWeeks)))
    const completionsInWindow = scopedTasks.filter(
      (t) => t.completed_at != null && new Date(t.completed_at).getTime() >= windowStart,
    ).length
    const throughput = completionsInWindow / weeksAvailable

    const open = scopedTasks.filter((t) => t.status !== 'done')
    const overdueNow = open.filter((t) => t.due_date != null && t.due_date < today).length
    const weeksBehind = throughput > 0 ? open.length / throughput : null

    // Verdict: is intake outrunning throughput over the recent window?
    const recentStart = now - RECENT_WEEKS * MS_WEEK
    let recentIntake = 0
    let recentThroughput = 0
    for (const t of scopedTasks) {
      if (new Date(t.created_at).getTime() >= recentStart) recentIntake++
      if (t.completed_at != null && new Date(t.completed_at).getTime() >= recentStart) recentThroughput++
    }
    const growing = recentIntake > recentThroughput
    const level: 'red' | 'amber' | 'calm' = growing
      ? weeksBehind != null && weeksBehind > CAPACITY_RED_WEEKS
        ? 'red'
        : 'amber'
      : 'calm'

    return { throughput, weeksBehind, overdueNow, growing, level }
  }, [scopedTasks, today])

  // 6) Per-person capacity — pace-relative, sorted by weeks-of-backlog desc (aging as a
  // tiebreaker, so someone buried in old no-due-date work surfaces even at a calm pace).
  // Always computed over the full team; the render filters to the scoped person.
  const perPerson = useMemo<PersonCapacity[]>(() => {
    const now = Date.now()
    const windowStart = now - THROUGHPUT_WEEKS * MS_WEEK

    const rows = members.map((m) => {
      const mine = tasks.filter((t) => t.pic_id === m.id)

      // Weeks of history available, capped at the trailing window (≥1) — so a member who
      // started 3 weeks ago is averaged over 3 weeks, not the full 8 ("all history if shorter").
      const firstMs = mine.reduce<number | null>((min, t) => {
        const c = new Date(t.created_at).getTime()
        return min == null || c < min ? c : min
      }, null)
      const historyWeeks = firstMs == null ? 0 : (now - firstMs) / MS_WEEK
      const weeksAvailable = Math.min(THROUGHPUT_WEEKS, Math.max(1, Math.ceil(historyWeeks)))

      const completionsInWindow = mine.filter(
        (t) => t.completed_at != null && new Date(t.completed_at).getTime() >= windowStart,
      ).length
      const throughput = completionsInWindow / weeksAvailable

      const openTasks = mine.filter((t) => t.status !== 'done')
      const openLoad = openTasks.length
      const overdue = openTasks.filter((t) => t.due_date != null && t.due_date < today).length
      const aging = openTasks.filter((t) => ageDays(t, now) > AGING_THRESHOLD_DAYS).length

      const weeksOfBacklog = throughput > 0 ? openLoad / throughput : null
      // Buried with no measurable pace sorts to the very top; idle-with-no-load to the bottom.
      const sortKey =
        weeksOfBacklog != null ? weeksOfBacklog : openLoad > 0 ? Number.POSITIVE_INFINITY : -1

      return { id: m.id, name: m.name || 'No name', throughput, openLoad, overdue, aging, weeksOfBacklog, sortKey }
    })

    // Primary: weeks-of-backlog (sortKey) desc. Tiebreaker: more aging work first.
    return rows.sort((a, b) => b.sortKey - a.sortKey || b.aging - a.aging)
  }, [members, tasks, today])

  const axisTick = { fontSize: 11, fill: SLATE }
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />

  // Verdict cue colours + the weeks-behind tile tone.
  const verdictDot =
    summary.level === 'red' ? 'bg-red-500' : summary.level === 'amber' ? 'bg-amber-500' : 'bg-navy'
  const verdictText =
    summary.level === 'red' ? 'text-red-700' : summary.level === 'amber' ? 'text-amber-700' : 'text-navy'
  const weeksTone: TileTone =
    summary.weeksBehind == null
      ? 'none'
      : summary.weeksBehind > CAPACITY_RED_WEEKS
        ? 'red'
        : summary.weeksBehind > CAPACITY_AMBER_WEEKS
          ? 'amber'
          : 'none'

  return (
    <div className="space-y-4">
      {/* ── FIRST SCREEN: glanceable verdict + headline tiles + trend sparkline ── */}
      <Card className={`p-4 ${summary.level === 'red' ? 'ring-1 ring-red-300/70' : summary.level === 'amber' ? 'ring-1 ring-amber-300/70' : ''}`}>
        <div className="flex items-start gap-2">
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${verdictDot}`} />
          <div className="min-w-0">
            <p className={`text-[15px] font-bold leading-snug ${verdictText}`}>
              {summary.growing ? 'Backlog is growing' : 'Keeping pace'}
            </p>
            <p className="text-xs text-slate-500">
              {scopeLabel}{' '}
              {summary.growing
                ? 'has more coming in than finishing.'
                : 'is finishing as fast as it comes in.'}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <Tile label="open now" value={currentOpen} />
          <Tile
            label="weeks behind"
            value={summary.weeksBehind == null ? '—' : summary.weeksBehind.toFixed(1)}
            tone={weeksTone}
          />
          <Tile label="aging" value={staleCount} tone={staleCount > 0 ? 'amber' : 'none'} />
          <Tile label="overdue" value={summary.overdueNow} tone={summary.overdueNow > 0 ? 'amber' : 'none'} />
        </div>

        <div className="mt-3 h-9">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={backlogTrend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Area type="monotone" dataKey="open" stroke={NAVY} fill={NAVY} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Backlog trend · last {BACKLOG_WEEKS} wks</p>
      </Card>

      {/* Compact capacity-by-person rows — team scope only (a person scope is the summary above). */}
      {scope === 'all' && perPerson.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Capacity by person</span>
            <span className="text-[10px] text-slate-400">weeks · open/overdue/aging</span>
          </div>
          <Card className="divide-y divide-white/50">
            {perPerson.map((p) => (
              <CompactPersonRow key={p.id} p={p} />
            ))}
          </Card>
        </div>
      )}

      {/* ── DETAIL (below the fold) — drill-down trends, all scope-filtered ── */}
      <div className="px-1 pt-2">
        <h3 className="text-sm font-semibold text-slate-700">Detail</h3>
        <p className="text-xs text-slate-400">Drill-down trends — all respect the scope above.</p>
      </div>

      {/* 1) Intake vs throughput */}
      <ChartCard
        title="Intake vs throughput · weekly"
        subtitle="When the Created line sits above Completed, backlog grows."
        height={200}
      >
        <ComposedChart data={intakeThroughput} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
          {grid}
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={28} />
          <Tooltip cursor={{ stroke: 'rgba(31,82,165,0.2)' }} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="throughput" name="Completed" stroke={SKY} fill={SKY} fillOpacity={0.25} strokeWidth={2} />
          <Line type="monotone" dataKey="intake" name="Created" stroke={NAVY} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ChartCard>

      {/* 2) Backlog trend */}
      <Card className="p-4">
        <div className="mb-1 flex items-end justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Open backlog · weekly</h3>
          <div className="text-right leading-none">
            <span className="text-2xl font-bold text-slate-900">{currentOpen}</span>
            <span className="ml-1 text-[11px] uppercase tracking-wide text-slate-400">open now</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={backlogTrend} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
            {grid}
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={28} />
            <Tooltip formatter={(value) => [value as number, 'Open']} />
            <Area type="monotone" dataKey="open" stroke={NAVY} fill={NAVY} fillOpacity={0.18} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* 3) Open work by age — due-date-free; catches lingering no-due-date work. */}
      <Card className="p-4">
        <div className="mb-1 flex items-end justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Open work by age</h3>
            <p className="text-xs text-slate-400">How long open agendas have sat (today − created).</p>
          </div>
          <div className="shrink-0 text-right leading-none">
            <span className={`text-2xl font-bold ${staleCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {staleCount}
            </span>
            <span className="ml-1 text-[11px] uppercase tracking-wide text-slate-400">
              stale (&gt;{AGING_THRESHOLD_DAYS}d)
            </span>
          </div>
        </div>
        {currentOpen === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No open agendas.</p>
        ) : (
          <ResponsiveContainer width="100%" height={96}>
            <BarChart data={ageDistribution} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip cursor={{ fill: 'rgba(100,116,139,0.06)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="le7" stackId="age" name="≤7d" fill={SKY} radius={[6, 0, 0, 6]} />
              <Bar dataKey="le14" stackId="age" name="8–14d" fill={NAVY} />
              <Bar dataKey="le30" stackId="age" name="15–30d" fill={AMBER} />
              <Bar dataKey="gt30" stackId="age" name=">30d" fill={RED} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* 4) Cycle-time trend */}
      <ChartCard
        title="Cycle time · weekly"
        subtitle="Avg days from created to completed. Rising = work taking longer."
        height={180}
      >
        <LineChart data={cycleTrend} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
          {grid}
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={28} />
          <Tooltip formatter={(value) => [value == null ? '—' : `${value as number} days`, 'Avg cycle']} />
          <Line type="monotone" dataKey="days" stroke={NAVY} strokeWidth={2} dot={{ r: 2 }} connectNulls />
        </LineChart>
      </ChartCard>

      {/* 5) Overdue trend */}
      <ChartCard
        title="Overdue agendas · weekly"
        subtitle="Open agendas with a due date that's passed. (No-due-date work → see aging above.)"
        height={180}
      >
        <AreaChart data={overdueTrend} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
          {grid}
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={28} />
          <Tooltip formatter={(value) => [value as number, 'Overdue']} />
          <Area type="monotone" dataKey="overdue" stroke={AMBER} fill={AMBER} fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ChartCard>
    </div>
  )
}

type TileTone = 'red' | 'amber' | 'none'

// Weeks-of-backlog severity. "Buried but no measurable pace" (null + open load) gets amber.
function weeksLevel(w: number | null, openLoad: number): TileTone {
  if (w != null) return w > CAPACITY_RED_WEEKS ? 'red' : w > CAPACITY_AMBER_WEEKS ? 'amber' : 'none'
  return openLoad > 0 ? 'amber' : 'none'
}

// A big-number tile in the summary card. Concerning tones go amber/red.
function Tile({ label, value, tone = 'none' }: { label: string; value: number | string; tone?: TileTone }) {
  const color = tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900'
  return (
    <div className="rounded-2xl bg-white/50 px-1.5 py-2 text-center">
      <div className={`text-xl font-extrabold leading-none ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase leading-tight tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

// One tight line per member: name · weeks-behind · tinted bar · open/overdue/aging.
function CompactPersonRow({ p }: { p: PersonCapacity }) {
  const w = p.weeksOfBacklog
  const level = weeksLevel(w, p.openLoad)
  const numberColor = level === 'red' ? 'text-red-700' : level === 'amber' ? 'text-amber-700' : 'text-slate-700'
  const barColor = level === 'red' ? RED : level === 'amber' ? AMBER : SKY
  const barPct = w != null ? Math.min(1, w / (CAPACITY_RED_WEEKS * 1.5)) * 100 : p.openLoad > 0 ? 100 : 0
  const weeksText = w != null ? `${w.toFixed(1)}w` : p.openLoad > 0 ? '—' : '0'

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <p className="w-24 shrink-0 truncate text-sm font-semibold text-slate-800">{p.name}</p>
      <div className={`w-10 shrink-0 text-right text-sm font-extrabold tabular-nums ${numberColor}`}>
        {weeksText}
      </div>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/70">
        <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
      </div>
      <p className="shrink-0 text-[11px] tabular-nums text-slate-400">
        {p.openLoad}/{p.overdue}/{p.aging}
      </p>
    </div>
  )
}
