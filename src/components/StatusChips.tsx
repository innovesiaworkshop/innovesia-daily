import type { TaskStatus } from '@/lib/types'

// The statuses the PIC can set by tapping. 'awaiting_approval' is driven by the
// approval flow, not these chips, so it isn't offered here.
const CHIPS: { status: TaskStatus; label: string }[] = [
  { status: 'on_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
]

// Tap-to-set status chips. Read-only (just shows the active state) unless the
// viewer is the task's PIC.
export function StatusChips({
  status,
  canEdit,
  saving,
  onChange,
}: {
  status: TaskStatus
  canEdit: boolean
  saving: boolean
  onChange: (next: TaskStatus) => void
}) {
  return (
    <div className="flex gap-2">
      {CHIPS.map(({ status: s, label }) => {
        const active = status === s
        return (
          <button
            key={s}
            type="button"
            disabled={!canEdit || saving}
            onClick={() => onChange(s)}
            aria-pressed={active}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:active:scale-100 ${
              active
                ? 'border-navy bg-navy text-white'
                : 'border-slate-200 bg-white text-slate-600'
            } ${!canEdit ? 'cursor-default opacity-90' : ''}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
