import type { ForTarget } from '@/hooks/useDelegate'

// Assistant-only "For:" selector — file the agenda(s) for yourself or the delegate target.
// Glass segmented pill, matching the other segmented controls.
export function ForToggle({
  value,
  onChange,
  targetLabel,
}: {
  value: ForTarget
  onChange: (next: ForTarget) => void
  targetLabel: string
}) {
  const options: { key: ForTarget; label: string }[] = [
    { key: 'self', label: 'Myself' },
    { key: 'bagus', label: targetLabel },
  ]
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">For</span>
      <div className="flex flex-1 rounded-full border border-white/50 bg-white/40 p-1 backdrop-blur">
        {options.map((o) => {
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
    </div>
  )
}
