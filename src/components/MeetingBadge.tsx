import { Users } from 'lucide-react'
import { formatTimeRange } from '@/lib/dates'
import type { AgendaType } from '@/lib/types'

// A small "Meeting · 09:00–10:00" marker shown on meeting rows + the agenda detail, so
// meetings read distinctly from tasks. Renders nothing for a plain task.
export function MeetingBadge({
  agendaType,
  startTime,
  endTime,
  className = '',
}: {
  agendaType: AgendaType
  startTime: string | null
  endTime: string | null
  className?: string
}) {
  if (agendaType !== 'meeting') return null
  const range = formatTimeRange(startTime, endTime)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy ${className}`}
    >
      <Users className="h-3 w-3" />
      {range ? <>Meeting · {range}</> : 'Meeting'}
    </span>
  )
}
