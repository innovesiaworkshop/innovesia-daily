import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { RoleSwitcher } from './RoleSwitcher'
import { useAuth } from '@/hooks/useAuth'

// Mobile-first app shell: a sticky brand header, a scrollable content area, and a
// fixed bottom navigation. Content is capped at max-w-md and centered so it stays
// phone-width on larger screens too.
export function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white">
      <header className="sticky top-0 z-10 flex flex-col gap-2 bg-navy px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">Innovesia Daily</h1>
            {profile && (
              <p className="truncate text-xs text-white/70">Hi, {profile.name || 'there'}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white transition active:scale-95"
          >
            Log out
          </button>
        </div>
        {/* Employer-only testing aid; renders null for real employees. */}
        <RoleSwitcher />
      </header>

      {/* Bottom padding leaves room for the fixed BottomNav. */}
      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
