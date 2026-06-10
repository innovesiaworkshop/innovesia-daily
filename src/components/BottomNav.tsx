import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

// Inline icons keep the shell dependency-free. Stroke uses currentColor so the
// active/inactive color is driven by Tailwind text classes below.
type IconProps = { className?: string }

function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function FolderIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  )
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  )
}

type NavItem = {
  to: string
  label: string
  Icon: (props: IconProps) => JSX.Element
  /** Employer-only tabs read the effective role, so the view-as switcher hides them. */
  employerOnly?: boolean
}

const items: NavItem[] = [
  { to: '/', label: 'Agenda', Icon: HomeIcon },
  { to: '/tambah', label: 'Add', Icon: PlusIcon },
  { to: '/proyek', label: 'Projects', Icon: FolderIcon },
  { to: '/dashboard', label: 'Dashboard', Icon: ChartIcon, employerOnly: true },
]

export function BottomNav() {
  const { effectiveRole } = useAuth()
  const visible = items.filter((item) => !item.employerOnly || effectiveRole === 'employer')

  return (
    <nav className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 rounded-full border border-white/50 bg-white/70 px-1.5 py-1.5 shadow-glass backdrop-blur-md">
      <ul className="flex items-stretch justify-around">
        {visible.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              aria-label={label}
              className="flex items-center justify-center py-1"
            >
              {({ isActive }) => (
                <span
                  className={`grid h-12 w-12 place-items-center rounded-full transition ${
                    isActive ? 'bg-navy text-white shadow-pill' : 'text-slate-400'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
