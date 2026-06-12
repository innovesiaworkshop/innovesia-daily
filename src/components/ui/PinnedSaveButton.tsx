import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'

// The primary "Save" pill, pinned above the bottom nav (absolute-in-shell, so the iOS
// keyboard pin covers it). Hidden while the keyboard is up so it never overlaps a focused
// field. Shared by the single Add Agenda and the Morning DSU batch flow so the two match.
export function PinnedSaveButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  const keyboardOpen = useKeyboardOpen()
  if (keyboardOpen) return null

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-20 w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 rounded-full bg-navy py-3.5 text-base font-semibold text-white shadow-pill transition active:scale-[0.99] disabled:opacity-60"
    >
      {label}
    </button>
  )
}
