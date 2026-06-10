import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/lib/types'

const SEGMENTS: { role: Role; label: string }[] = [
  { role: 'employee', label: 'Employee' },
  { role: 'employer', label: 'Manager' },
]

// Employer-only testing aid: a segmented control to view the app as either role.
// Hidden entirely for real employees (see CLAUDE.md). Sets the in-memory viewAsRole,
// so all role-gated UI re-evaluates instantly with no reload.
export function RoleSwitcher() {
  const { profile, effectiveRole, setViewAsRole } = useAuth()

  // Only real employers get the switcher.
  if (profile?.role !== 'employer') return null

  return (
    <div
      role="group"
      aria-label="View as"
      className="flex rounded-lg bg-white/15 p-0.5 text-xs font-medium"
    >
      {SEGMENTS.map(({ role, label }) => {
        const active = effectiveRole === role
        return (
          <button
            key={role}
            type="button"
            aria-pressed={active}
            onClick={() => setViewAsRole(role)}
            className={`rounded-md px-2.5 py-1 transition ${
              active ? 'bg-white text-navy' : 'text-white/80'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
