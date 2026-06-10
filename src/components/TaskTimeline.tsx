import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatTimestampDate } from '@/lib/dates'
import type { ProjectTask, TaskStatus } from '@/lib/types'

const STATUS_LABEL: Record<TaskStatus, string> = {
  awaiting_approval: 'Waiting for Approval',
  on_progress: 'In Progress',
  done: 'Completed',
}

// Circular node styling per status (the node carries the state colour, so the text
// sub-line can stay muted — matching the reference). done = solid navy + check;
// on_progress = navy ring + clock (active, with halo); awaiting = gold + clock.
const NODE: Record<TaskStatus, string> = {
  done: 'bg-navy text-white',
  on_progress: 'border-2 border-navy bg-white text-navy ring-4 ring-navy/10',
  awaiting_approval: 'bg-gold text-navy',
}

// The date a task sits at on the timeline: when it was completed (if done), else created.
function timelineDate(task: ProjectTask): string {
  return task.status === 'done' && task.completed_at ? task.completed_at : task.created_at
}

// A vertical timeline auto-derived from a project's tasks, oldest at top. Circular status
// nodes joined by a connector (navy below completed tasks, gray otherwise). Each node opens
// the task on tap; file chips open inline (signed URL) without navigating.
export function TaskTimeline({ tasks }: { tasks: ProjectTask[] }) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function openFile(path: string) {
    setError(null)
    const { data, error: urlErr } = await supabase.storage
      .from('task-files')
      .createSignedUrl(path, 60)
    if (urlErr || !data) {
      setError("Couldn't open file. Try again.")
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-slate-400">No tasks in this project yet.</p>
  }

  // Ascending by timeline date (ISO strings sort lexically); most recent is last.
  const ordered = [...tasks].sort((a, b) => timelineDate(a).localeCompare(timelineDate(b)))
  const lastIndex = ordered.length - 1

  return (
    <div>
      <ol>
        {ordered.map((task, i) => {
          const isLast = i === lastIndex
          return (
            <li key={task.id} className="flex gap-3.5">
              {/* Marker column: status circle + connector growing to the next node. */}
              <div className="flex flex-col items-center">
                <div
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${NODE[task.status]}`}
                >
                  {task.status === 'done' ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                {!isLast && (
                  <span
                    aria-hidden
                    className={`mt-1 w-0.5 grow rounded-full ${
                      task.status === 'done' ? 'bg-navy' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>

              {/* Node body — tapping anywhere (except a file chip) opens the task. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/tugas/${task.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/tugas/${task.id}`)
                }}
                className="min-w-0 flex-1 cursor-pointer pb-7 last:pb-0"
              >
                <p className="text-xs text-slate-400">{formatTimestampDate(timelineDate(task))}</p>
                <p className="mt-0.5 font-semibold leading-snug text-slate-900">{task.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {STATUS_LABEL[task.status]} · PIC: {task.pic?.name || 'No name'}
                </p>

                {task.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {task.files.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void openFile(f.file_path)
                        }}
                        className="max-w-[12rem] truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-sky active:bg-slate-50"
                      >
                        {f.file_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
