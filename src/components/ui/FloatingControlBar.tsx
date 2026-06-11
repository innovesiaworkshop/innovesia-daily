import type { ReactNode } from 'react'

// A frosted, rounded glass bar (styled like the segmented project pill) that sticks just below
// the app header while the page scrolls. `<main>` is the only scroller and sits below the fixed
// header, so `sticky top-2` always rests under the header regardless of its height. Two slots.
export function FloatingControlBar({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="sticky top-2 z-10 flex items-center justify-between gap-2 rounded-full border border-white/50 bg-white/40 p-1.5 shadow-glass backdrop-blur-md">
      <div className="flex min-w-0 items-center">{left}</div>
      <div className="flex min-w-0 items-center gap-2">{right}</div>
    </div>
  )
}
