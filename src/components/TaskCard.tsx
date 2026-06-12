import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, Check, Trash2 } from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import { MeetingBadge } from '@/components/MeetingBadge'
import { formatDueDate, formatTimestampDate, isOverdue } from '@/lib/dates'
import type { TaskWithProject } from '@/lib/types'

// A move-between-lists action shown inline (tap, not drag).
export interface MoveAction {
  label: string
  onMove: () => void
}

// A home-screen task card. The whole card taps through to Detail Tugas; project / name / due
// stack on the left, and (when present) the delete / complete / move actions sit in a row
// BELOW the due date so they never collide with the right-edge shortcut rail.
export function TaskCard({
  task,
  onComplete,
  onDelete,
  moveAction,
}: {
  task: TaskWithProject
  onComplete?: () => void
  onDelete?: () => void
  moveAction?: MoveAction
}) {
  const navigate = useNavigate()
  const overdue = isOverdue(task)
  const due = formatDueDate(task.due_date)
  const isDone = task.status === 'done'
  const hasActions = !!onDelete || !!onComplete || !!moveAction

  return (
    <Card onClick={() => navigate(`/tugas/${task.id}`)} className="p-4">
      <p className="truncate text-sm text-sky">{task.project?.name ?? 'No project'}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <h3 className="truncate font-semibold leading-snug text-slate-900">{task.name}</h3>
        {overdue && <Badge tone="pending">Warning</Badge>}
      </div>
      <MeetingBadge
        agendaType={task.agenda_type}
        startTime={task.start_time}
        endTime={task.end_time}
        className="mt-1"
      />
      <p className="mt-1 text-xs text-slate-500">
        {isDone && task.completed_at
          ? `Done: ${formatTimestampDate(task.completed_at)}`
          : due
            ? `Due: ${due}`
            : 'No due date'}
      </p>

      {hasActions && (
        <div className="mt-3 flex items-center gap-1 border-t border-white/40 pt-3">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label="Delete task"
              className="grid h-8 w-8 place-items-center rounded-lg text-red-500 transition active:scale-90 active:bg-red-50"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          {onComplete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onComplete()
              }}
              aria-label="Mark task as done"
              className="grid h-8 w-8 place-items-center rounded-lg text-navy transition active:scale-90 active:bg-sky/10"
            >
              <Check className="h-5 w-5" />
            </button>
          )}
          {moveAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                moveAction.onMove()
              }}
              aria-label={moveAction.label}
              className="grid h-8 w-8 place-items-center rounded-lg text-navy transition active:scale-90 active:bg-sky/10"
            >
              <ArrowRightLeft className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
