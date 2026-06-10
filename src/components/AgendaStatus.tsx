export type AgendaStatusKey = 'today' | 'all' | 'completed'

const OPTIONS: { key: AgendaStatusKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
]

// The PIC's 3-way state control for an editable agenda. The parent maps each key to the
// underlying status / planned_for / completed_at update. Read-only unless `canEdit`.
export function AgendaStatus({
  active,
  canEdit,
  saving,
  onSelect,
}: {
  active: AgendaStatusKey
  canEdit: boolean
  saving: boolean
  onSelect: (key: AgendaStatusKey) => void
}) {
  return (
    <div className="flex rounded-full border border-white/50 bg-white/40 p-1 backdrop-blur">
      {OPTIONS.map(({ key, label }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            type="button"
            disabled={!canEdit || saving}
            onClick={() => onSelect(key)}
            aria-pressed={isActive}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
              isActive ? 'bg-navy text-white shadow-sm' : 'text-slate-600'
            } ${!canEdit ? 'cursor-default' : 'active:scale-[0.99]'}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
