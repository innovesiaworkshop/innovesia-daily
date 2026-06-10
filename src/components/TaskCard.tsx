import { useNavigate } from 'react-router-dom'
import { Check, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui'
import { Badge } from '@/components/ui'
import { formatDueDate, formatTimestampDate, isOverdue } from '@/lib/dates'
import type { TaskWithProject } from '@/lib/types'

// A move-between-lists action shown inline (tap, not drag).
export interface MoveAction {
  label: string
  onMove: () => void
}

// A home-screen task card. The whole card taps through to Detail Tugas; the optional
// action icons (delete / complete) sit BESIDE the text on the same row, and the move
// action is a small inline link — keeping the card compact and short.
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

  return (
    <Card onClick={() => navigate(`/tugas/${task.id}`)} className="p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold leading-snug text-slate-900">{task.name}</h3>
            {overdue && <Badge tone="pending">Warning</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-sky">{task.project?.name ?? 'No project'}</p>
          <p className="mt-1 text-xs text-slate-500">
            {isDone && task.completed_at
              ? `Done: ${formatTimestampDate(task.completed_at)}`
              : due
                ? `Due: ${due}`
                : 'No due date'}
            {moveAction && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    moveAction.onMove()
                  }}
                  className="font-medium text-navy active:opacity-70"
                >
                  {moveAction.label}
                </button>
              </>
            )}
          </p>
        </div>

        {(onDelete || onComplete) && (
          <div className="flex shrink-0 items-center gap-1">
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
          </div>
        )}
      </div>
    </Card>
  )
}
