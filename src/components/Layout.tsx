import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

// Mobile-first app shell: a sticky brand header, a scrollable content area, and a
// fixed bottom navigation. Content is capped at max-w-md and centered so it stays
// phone-width on larger screens too.
export function Layout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white">
      <header className="sticky top-0 z-10 bg-navy px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white">
        <h1 className="text-lg font-semibold">Innovesia Daily</h1>
      </header>

      {/* Bottom padding leaves room for the fixed BottomNav. */}
      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
