import type { KeyboardEvent, ReactNode } from 'react'

// A frosted-glass surface — the building block of the UI. Default is a plain semi-opaque
// glass (no backdrop-blur, so scrolling lists stay smooth); pass `blur` for the fully
// frosted treatment (header, swipe cards, dialogs). Unpadded; callers control spacing.
export function Card({
  children,
  className = '',
  blur = false,
  onClick,
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  blur?: boolean
  onClick?: () => void
  ariaLabel?: string
}) {
  const base = `rounded-3xl border border-white/40 shadow-glass ${
    blur ? 'bg-white/65 backdrop-blur-md' : 'bg-white/80'
  }`

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') onClick()
        }}
        className={`${base} cursor-pointer transition active:scale-[0.99] ${className}`}
      >
        {children}
      </div>
    )
  }

  return <div className={`${base} ${className}`}>{children}</div>
}
