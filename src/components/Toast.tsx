import { useEffect } from 'react'

// A brief, self-dismissing confirmation pinned above the bottom nav. Render it
// conditionally; it calls onDone after `duration` so the parent can clear it.
export function Toast({
  message,
  duration = 2500,
  onDone,
}: {
  message: string
  duration?: number
  onDone: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4">
      <div className="rounded-full bg-navy px-4 py-2 text-sm font-medium text-white shadow-lg">
        {message}
      </div>
    </div>
  )
}
