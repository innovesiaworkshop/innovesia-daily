import { useNavigate } from 'react-router-dom'
import { Check, Trash2 } from 'lucide-react'
import { formatDueDate, formatTimestampDate, isOverdue } from '@/lib/dates'
import type { TaskWithProject } from '@/lib/types'

// A move-between-lists action shown in the card footer (tap, not drag).
export interface MoveAction {
  label: string
  onMove: () => void
}

// A home-screen task card. The body navigates to Detail Tugas; an optional action
// area holds mark-done / delete icon buttons and a move link, none of which trigger
// the navigation.
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
  const hasActions = !!onComplete || !!onDelete || !!moveAction

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <button
        type="button"
        onClick={() => navigate(`/tugas/${task.id}`)}
        className="w-full text-left transition active:opacity-70"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-slate-900">{task.name}</h3>
          {overdue && (
            <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-navy">
              Overdue
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-sky">{task.project?.name ?? 'No project'}</p>
        {isDone && task.completed_at ? (
          <p className="mt-1 text-xs text-slate-500">
            Done: {formatTimestampDate(task.completed_at)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">{due ? `Due: ${due}` : 'No due date'}</p>
        )}
      </button>

      {hasActions && (
        <div className="mt-2.5 border-t border-slate-100 pt-2.5">
          {(onComplete || onDelete) && (
            <div className="flex justify-end gap-1">
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Delete task"
                  className="grid h-9 w-9 place-items-center rounded-lg text-red-500 transition active:scale-90 active:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
              {onComplete && (
                <button
                  type="button"
                  onClick={onComplete}
                  aria-label="Mark task as done"
                  className="grid h-9 w-9 place-items-center rounded-lg text-navy transition active:scale-90 active:bg-sky/10"
                >
                  <Check className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {moveAction && (
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={moveAction.onMove}
                className="text-sm font-medium text-navy active:opacity-70"
              >
                {moveAction.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
