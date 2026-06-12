// Glass segmented pill for choosing the Dashboard scope: the whole team or a single member.
// Horizontally scrollable so any team size fits; styled like the AgendaStatus segmented control.
export interface ScopeOption {
  id: string
  label: string
}

export function ScopeSelector({
  options,
  value,
  onChange,
}: {
  options: ScopeOption[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <span className="px-1 text-xs font-medium uppercase tracking-wide text-slate-400">Scope</span>
      <div className="flex gap-1 overflow-x-auto rounded-full border border-white/50 bg-white/40 p-1 backdrop-blur">
        {options.map((o) => {
          const isActive = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={isActive}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-[0.99] ${
                isActive ? 'bg-navy text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
