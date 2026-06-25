import type { AgendaType } from '@/lib/types'

export type AgendaFilter = 'all' | AgendaType

const OPTIONS: { key: AgendaFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'task', label: 'Agenda' },
  { key: 'meeting', label: 'Meeting' },
]

// Glass segmented filter for the agenda lists: All / Agenda (tasks) / Meeting.
export function AgendaTypeFilter({
  value,
  onChange,
}: {
  value: AgendaFilter
  onChange: (next: AgendaFilter) => void
}) {
  return (
    <div className="flex rounded-full border border-white/50 bg-white/40 p-1 backdrop-blur">
      {OPTIONS.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition active:scale-[0.99] ${
              active ? 'bg-navy text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// True when a row matches the active filter.
export function matchesFilter(agendaType: AgendaType, filter: AgendaFilter): boolean {
  return filter === 'all' || agendaType === filter
}
