import type { ReactNode } from 'react'

// Brand-palette chip. NB: 'success' is navy-tinted, NOT green (palette is navy/sky/gold only).
type Tone = 'pending' | 'info' | 'success' | 'danger' | 'neutral'

const TONES: Record<Tone, string> = {
  pending: 'bg-gold text-navy', // awaiting / needs action
  info: 'bg-sky text-white', // in progress / accents
  success: 'bg-navy/10 text-navy', // done (navy-tinted, not green)
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
