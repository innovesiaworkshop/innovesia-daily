import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy text-white shadow-pill active:scale-[0.98]',
  secondary: 'bg-white text-navy border border-slate-200 active:bg-slate-50',
  danger: 'bg-red-600 text-white active:scale-[0.98]',
}

// A fully-rounded pill button in the brand style. Defaults to type="button".
export function PillButton({
  variant = 'primary',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: {
  variant?: Variant
  fullWidth?: boolean
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
        VARIANTS[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
