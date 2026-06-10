import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatTimestampDate } from '@/lib/dates'
import type { ProjectTask, TaskStatus } from '@/lib/types'

// Status pill styling per the brand palette.
const STATUS: Record<TaskStatus, { label: string; className: string }> = {
  awaiting_approval: { label: 'Awaiting Approval', className: 'bg-gold text-navy' },
  on_progress: { label: 'In Progress', className: 'bg-sky text-white' },
  done: { label: 'Done', className: 'bg-green-100 text-green-700' },
}

// The date a task sits at on the timeline: when it was completed (if done), else created.
function timelineDate(task: ProjectTask): string {
  return task.status === 'done' && task.completed_at ? task.completed_at : task.created_at
}

// A vertical, connected timeline auto-derived from a project's tasks, oldest at top.
// Navy line + dots; the most recent task gets a gold dot. Each node opens the task on
// tap; file chips open inline (signed URL) without navigating.
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
          const isLatest = i === lastIndex
          const status = STATUS[task.status]
          return (
            <li key={task.id} className="flex gap-3">
              {/* Marker column: a dot with a line that grows to meet the next dot. */}
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${
                    isLatest ? 'bg-gold' : 'bg-navy'
                  }`}
                />
                {!isLatest && <span aria-hidden className="mt-1 w-0.5 grow bg-navy/30" />}
              </div>

              {/* Node body — tapping anywhere (except a file chip) opens the task. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/tugas/${task.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/tugas/${task.id}`)
                }}
                className="min-w-0 flex-1 cursor-pointer pb-6 last:pb-0"
              >
                <p className="text-xs text-slate-400">{formatTimestampDate(timelineDate(task))}</p>
                <p className="mt-0.5 font-semibold leading-snug text-slate-900">{task.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                  <span>PIC: {task.pic?.name || 'No name'}</span>
                </p>

                {task.files.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {task.files.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void openFile(f.file_path)
                        }}
                        className="max-w-[12rem] truncate rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-sky active:bg-slate-50"
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
