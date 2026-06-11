import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui'
import { theme } from '@/config/theme.registry'
import { localDateISO } from '@/lib/dates'
import type { DailyCompletion } from '@/lib/types'
import type { StatusCounts } from '@/hooks/useDailyCompletions'

// Brand palette from the active client theme (recharts needs colour values, not classes).
const NAVY = theme.colors.primary
const SKY = theme.colors.accent
const GOLD = theme.colors.highlight
const SLATE = '#64748b'

const dayLong = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

interface Member {
  id: string
  name: string
}

function ChartCard({ title, height, children }: { title: string; height: number; children: React.ReactElement }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </Card>
  )
}

export function DashboardCharts({
  completions,
  members,
  statusCounts,
}: {
  completions: DailyCompletion[]
  members: Member[]
  statusCounts: StatusCounts
}) {
  // 1) Completions per day — all 14 day buckets, oldest → newest.
  const perDay = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of completions) {
      const d = localDateISO(c.completed_at)
      counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    const out: { label: string; full: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = localDateISO(d)
      out.push({ label: String(d.getDate()), full: dayLong.format(d), count: counts.get(iso) ?? 0 })
    }
    return out
  }, [completions])

  // 2) Completions per person — sorted desc.
  const perPerson = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of completions) {
      if (c.pic?.id) counts.set(c.pic.id, (counts.get(c.pic.id) ?? 0) + 1)
    }
    return members
      .map((m) => ({ name: m.name || 'No name', count: counts.get(m.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
  }, [members, completions])

  // 3) Current task status — canonical status colours.
  const statusData = [
    { name: 'In Progress', value: statusCounts.in_progress, color: SKY },
    { name: 'Awaiting Approval', value: statusCounts.awaiting_approval, color: GOLD },
    { name: 'Done', value: statusCounts.done, color: NAVY },
  ]
  const statusTotal = statusCounts.in_progress + statusCounts.awaiting_approval + statusCounts.done

  const axisTick = { fontSize: 11, fill: SLATE }

  return (
    <div className="space-y-4">
      <ChartCard title="Completions per day · last 14 days" height={180}>
        <BarChart data={perDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" interval={1} tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            cursor={{ fill: 'rgba(31,82,165,0.06)' }}
            labelFormatter={(_l, p) => (p?.[0]?.payload as { full?: string })?.full ?? ''}
            formatter={(value) => [value as number, 'Completed']}
          />
          <Bar dataKey="count" fill={NAVY} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Completions per person · last 14 days" height={Math.max(140, perPerson.length * 36)}>
        <BarChart data={perPerson} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={96} tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(20,180,232,0.08)' }}
            formatter={(value) => [value as number, 'Completed']}
          />
          <Bar dataKey="count" fill={SKY} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>

      <Card className="relative p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Current task status</h3>
        {statusTotal === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No active tasks.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value as number, name]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Total in the donut centre (legend sits in the lower ~36px, so bias up). */}
            <div className="pointer-events-none absolute inset-x-0 top-[4.25rem] flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-900">{statusTotal}</span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">total</span>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
