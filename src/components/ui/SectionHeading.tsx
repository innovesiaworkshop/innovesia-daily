import type { ReactNode } from 'react'

// A bold section label with an optional leading icon, count pill, and right-aligned action.
export function SectionHeading({
  label,
  count,
  icon,
  action,
  className = '',
}: {
  label: string
  count?: number
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`mb-3 flex items-center gap-2 ${className}`}>
      {icon && <span className="text-navy">{icon}</span>}
      <h2 className="text-[17px] font-bold tracking-tight text-slate-900">{label}</h2>
      {count !== undefined && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">
          {count}
        </span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}
