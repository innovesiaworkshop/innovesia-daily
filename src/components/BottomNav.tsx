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

function InboxIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h5l2 3h4l2-3h5" />
      <path d="M5 5h14l2 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z" />
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

// Labels are in Bahasa Indonesia per CLAUDE.md.
const items: NavItem[] = [
  { to: '/', label: 'Tasks', Icon: HomeIcon },
  { to: '/tambah', label: 'Add Task', Icon: PlusIcon },
  { to: '/proyek', label: 'Projects', Icon: FolderIcon },
  { to: '/perlu-tindakan', label: 'To Review', Icon: InboxIcon, employerOnly: true },
  { to: '/dashboard', label: 'Dashboard', Icon: ChartIcon, employerOnly: true },
]

export function BottomNav() {
  const { effectiveRole } = useAuth()
  const visible = items.filter((item) => !item.employerOnly || effectiveRole === 'employer')

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {visible.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-navy' : 'text-slate-400'
                }`
              }
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
