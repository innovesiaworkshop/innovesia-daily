import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { RoleSwitcher } from './RoleSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import { theme } from '@/config/theme.registry'
import { headerBranding } from '@/config/branding'

// Pages on dynamic routes (e.g. /proyek/:id, /tugas/:id) push their header title — and
// optionally a back affordance — up into the shared header via Outlet context.
export type LayoutHeader = { title: string | null; onBack?: (() => void) | null }
export type LayoutOutletContext = { setHeader: (header: LayoutHeader) => void }

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

// White overlay over the app background image (tune 0.30–0.40) for glass/text contrast.
const APP_OVERLAY = 0.35

// Header title per page (exact path; detail routes show no title — they have back headers).
const PAGE_TITLES: Record<string, string> = {
  '/': 'Daily Stand-Up',
  '/tambah': 'New Agenda',
  '/proyek': 'Projects',
  '/team': 'Team Day',
  '/dashboard': 'Dashboard',
}

// Mobile-first app shell: a frozen brand header (which carries the home screen title),
// a scrollable content area (`main` is the only scroller), and a bottom nav. Content is
// capped at max-w-md and centered so it stays phone-width on larger screens.
export function Layout() {
  const { profile, signOut } = useAuth()
  const pathname = useLocation().pathname
  const isHome = pathname === '/'
  // Static path titles, with a dynamic-route fallback a page can set (e.g. record name + back).
  const [header, setHeader] = useState<LayoutHeader>({ title: null, onBack: null })
  const titleFromPath = PAGE_TITLES[pathname]
  const pageTitle = titleFromPath ?? header.title ?? undefined
  const isDynamic = !titleFromPath && header.title != null
  const onBack = header.onBack ?? null
  const keyboardOpen = useKeyboardOpen()

  return (
    <div className="relative mx-auto flex h-full max-w-md flex-col overflow-hidden">
      {/* Fixed app background behind all glass; the frosted blur samples it. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url('${theme.assets.appBackground}')` }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-white" style={{ opacity: APP_OVERLAY }} />

      {/* Floating rounded glass header; clears the status bar / notch via the safe area. */}
      <header className="z-20 flex shrink-0 flex-col gap-2 rounded-b-3xl border border-t-0 border-white/50 bg-white/55 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-slate-800 shadow-glass backdrop-blur-md">
        {/* Wordmark, centered; Log out pinned right. */}
        <div className="relative flex items-center justify-center">
          <div className="flex items-baseline gap-1.5">
            {(() => {
              const title = headerBranding(theme)
              return title.kind === 'wordmark' ? (
                <>
                  <span className="text-lg font-extrabold tracking-tight text-navy">
                    {title.lead}
                  </span>
                  <span className="text-lg font-light italic text-navy/70">{title.accent}</span>
                </>
              ) : (
                <span className="text-lg font-extrabold tracking-tight text-navy">
                  {title.text}
                </span>
              )
            })()}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-slate-300/70 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 transition active:scale-95"
          >
            Log out
          </button>
        </div>

        {pageTitle && (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {!isDynamic && profile && (
                <p className="truncate text-xs text-slate-500">Hi, {profile.name || 'there'}</p>
              )}
              <div className="mt-0.5 flex items-center gap-2">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back"
                    className="-ml-1 shrink-0 rounded-full p-1 text-slate-600 transition active:bg-white/60"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                <span className="h-7 w-1 shrink-0 rounded-full bg-navy" />
                <h2 className="line-clamp-2 break-words text-2xl font-extrabold tracking-tight text-slate-900">
                  {pageTitle}
                </h2>
              </div>
              {isHome && (
                <p className="mt-0.5 text-xs text-slate-500">{dayFormatter.format(new Date())}</p>
              )}
            </div>
            {pathname !== '/tambah' && !isDynamic && (
              <Link
                to="/tambah"
                className="shrink-0 rounded-full bg-navy px-3.5 py-2 text-sm font-semibold text-white shadow-pill transition active:scale-95"
              >
                + Agenda
              </Link>
            )}
          </div>
        )}

        {/* Employer-only testing aid; renders null for real employees. */}
        <RoleSwitcher />
      </header>

      {/* The only scroll container; bottom padding clears the floating nav. While the keyboard
          is up the nav + pinned bars are hidden, so the reserved space collapses (no dead gap
          between the form and the keyboard). */}
      <main
        className={`flex-1 overflow-y-auto px-4 pt-4 ${
          keyboardOpen ? 'pb-4' : 'pb-[calc(env(safe-area-inset-bottom)+6rem)]'
        }`}
      >
        <Outlet context={{ setHeader } satisfies LayoutOutletContext} />
      </main>

      <BottomNav />
    </div>
  )
}
