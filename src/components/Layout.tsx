import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { RoleSwitcher } from './RoleSwitcher'
import { useAuth } from '@/hooks/useAuth'

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

// Mobile-first app shell: a frozen brand header (which carries the home screen title),
// a scrollable content area (`main` is the only scroller), and a bottom nav. Content is
// capped at max-w-md and centered so it stays phone-width on larger screens.
export function Layout() {
  const { profile, signOut } = useAuth()
  const isHome = useLocation().pathname === '/'

  return (
    <div className="relative mx-auto flex h-full max-w-md flex-col overflow-hidden">
      {/* Floating rounded glass header; clears the status bar / notch via the safe area. */}
      <header className="z-20 mx-3 mt-[calc(env(safe-area-inset-top)+0.5rem)] flex shrink-0 flex-col gap-2 rounded-3xl border border-white/50 bg-white/55 px-4 py-3 text-slate-800 shadow-glass backdrop-blur-md">
        {/* Wordmark, centered. */}
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-lg font-extrabold tracking-tight text-navy">Innovesia</span>
          <span className="text-lg font-light italic text-navy/70">daily</span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {profile && (
              <p className="truncate text-xs text-slate-500">Hi, {profile.name || 'there'}</p>
            )}
            {isHome && (
              <>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Daily Stand-Up</h2>
                <p className="text-xs text-slate-500">{dayFormatter.format(new Date())}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 rounded-full border border-slate-300/70 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 transition active:scale-95"
          >
            Log out
          </button>
        </div>

        {/* Employer-only testing aid; renders null for real employees. */}
        <RoleSwitcher />
      </header>

      {/* The only scroll container; bottom padding clears the floating nav. */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
