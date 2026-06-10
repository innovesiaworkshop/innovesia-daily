import { Calendar, CheckCircle2, Clock, ListTodo } from 'lucide-react'

// The home "section" anchors the rail jumps to (also used as element ids).
export type HomeSection = 'approval' | 'today' | 'all' | 'completed'

const ITEMS: { section: HomeSection; label: string; Icon: typeof Clock }[] = [
  { section: 'approval', label: 'Waiting for Approval', Icon: Clock },
  { section: 'today', label: "Today's Agenda", Icon: Calendar },
  { section: 'all', label: 'All Agenda', Icon: ListTodo },
  { section: 'completed', label: 'Completed', Icon: CheckCircle2 },
]

// A pinned vertical shortcut navigator on the right edge: tapping an icon smooth-scrolls
// to that home section; the active section's icon is highlighted. Floating glass pill.
export function ShortcutRail({
  active,
  onJump,
}: {
  active: HomeSection
  onJump: (section: HomeSection) => void
}) {
  return (
    <nav
      aria-label="Jump to section"
      className="fixed right-2 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 rounded-full border border-white/50 bg-white/60 p-1.5 shadow-glass backdrop-blur-md"
    >
      {ITEMS.map(({ section, label, Icon }) => {
        const isActive = active === section
        return (
          <button
            key={section}
            type="button"
            aria-label={label}
            aria-current={isActive}
            onClick={() => onJump(section)}
            className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-90 ${
              isActive ? 'bg-navy text-white shadow-pill' : 'text-slate-500 active:bg-white/70'
            }`}
          >
            <Icon className="h-6 w-6" />
          </button>
        )
      })}
    </nav>
  )
}
