import { useRegisterSW } from 'virtual:pwa-register/react'

// Surfaces a small glass toast when a new service worker (new deploy) is waiting, so the
// installed app can refresh instead of serving stale cache. Reload applies the SW + reloads.
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/50 bg-white/80 px-4 py-3 shadow-glass backdrop-blur-md">
      <p className="min-w-0 flex-1 text-sm font-medium text-slate-800">New version available</p>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 active:bg-white/60"
      >
        Later
      </button>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="shrink-0 rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white shadow-pill transition active:scale-[0.98]"
      >
        Reload
      </button>
    </div>
  )
}
