import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { TimelineComments } from '@/components/TimelineComments'
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
// nodes joined by a connector (navy below completed tasks, gray otherwise). Tapping a node's
// text opens the task; file chips (to the right) open inline; "See comments" expands the
// task's comment thread inline without leaving the timeline.
export function TaskTimeline({ tasks }: { tasks: ProjectTask[] }) {
  const navigate = useNavigate()
  const { profile, effectiveRole } = useAuth()
  const [error, setError] = useState<string | null>(null)
  // Which nodes have their comment thread expanded.
  const [open, setOpen] = useState<Set<string>>(new Set())
  // Task ids the viewer is tagged on (drives comment permission alongside PIC / manager).
  const [taggedIds, setTaggedIds] = useState<Set<string>>(new Set())

  // Load the viewer's tags across this project's tasks once (for the comment permission).
  useEffect(() => {
    const ids = tasks.map((t) => t.id)
    if (!profile || ids.length === 0) {
      setTaggedIds(new Set())
      return
    }
    let active = true
    supabase
      .from('task_tags')
      .select('task_id')
      .eq('user_id', profile.id)
      .in('task_id', ids)
      .then(({ data }) => {
        if (active) setTaggedIds(new Set((data ?? []).map((r) => r.task_id as string)))
      })
    return () => {
      active = false
    }
  }, [tasks, profile])

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

  function toggleComments(taskId: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function canComment(task: ProjectTask): boolean {
    return (
      effectiveRole === 'employer' ||
      profile?.id === task.pic_id ||
      taggedIds.has(task.id)
    )
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
          const isOpen = open.has(task.id)
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

              {/* Node body: text (left, tappable) + file chips / See comments (right).
                  A faint divider (content width) separates entries; none after the last. */}
              <div
                className={`min-w-0 flex-1 ${isLast ? '' : 'border-b border-white/30 pb-6'}`}
              >
                <div className="flex items-center gap-3">
                  {/* Tapping the text opens the task. */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/tugas/${task.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`/tugas/${task.id}`)
                    }}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <p className="text-xs text-slate-400">
                      {formatTimestampDate(timelineDate(task))}
                    </p>
                    <p className="mt-0.5 font-semibold leading-snug text-slate-900">{task.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {STATUS_LABEL[task.status]} · PIC: {task.pic?.name || 'No name'}
                    </p>
                  </div>

                  {/* Right column: file chips, then the See-comments toggle. */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {task.files.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => void openFile(f.file_path)}
                        className="max-w-[9rem] truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-sky active:bg-slate-50"
                      >
                        {f.file_name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => toggleComments(task.id)}
                      aria-expanded={isOpen}
                      className="text-xs font-medium text-sky active:opacity-70"
                    >
                      {isOpen ? 'Hide comments' : 'See comments'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3">
                    <TimelineComments
                      taskId={task.id}
                      authorId={profile?.id ?? ''}
                      canComment={canComment(task)}
                    />
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
