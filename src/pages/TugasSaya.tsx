import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useMyTasks } from '@/hooks/useMyTasks'
import { usePendingApprovals } from '@/hooks/usePendingApprovals'
import { useApprovalActions } from '@/hooks/useApprovalActions'
import { TaskCard } from '@/components/TaskCard'
import { PendingApprovalCard } from '@/components/PendingApprovalCard'
import { ApprovalDialogs } from '@/components/ApprovalDialogs'
import { Toast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { localDateISO, todayISO } from '@/lib/dates'
import type { TaskWithProject } from '@/lib/types'

// Section heading with a count pill, matching the rest of the app.
function Heading({ label, count }: { label: string; count: number }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
      {label}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        {count}
      </span>
    </h2>
  )
}

export function TugasSaya() {
  const { profile, effectiveRole } = useAuth()
  const { tasks, loading, error, refetch } = useMyTasks()

  // Employer-only: all team tasks awaiting approval (kept live by its own realtime).
  const isEmployer = effectiveRole === 'employer'
  const pendingApprovals = usePendingApprovals()
  const approvalActions = useApprovalActions()

  // A toast can be handed over via router state (e.g. after saving a task).
  const location = useLocation()
  const [toast, setToast] = useState<string | null>(
    (location.state as { toast?: string } | null)?.toast ?? null,
  )

  const [approvalOpen, setApprovalOpen] = useState(true)
  const [showAllDone, setShowAllDone] = useState(false)
  // A pending confirm: either marking a task done or deleting it.
  const [pending, setPending] = useState<{ task: TaskWithProject; kind: 'complete' | 'delete' } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const today = todayISO()

  // Split the user's tasks into the four home sections (status values are unchanged;
  // planned_for / completed_at decide which bucket an on_progress / done task lands in).
  const { approval, todayTasks, backlog, doneToday, allDone } = useMemo(() => {
    const approval = tasks.filter((t) => t.status === 'awaiting_approval')
    const onProgress = tasks.filter((t) => t.status === 'on_progress')
    // Unfinished tasks from earlier days roll over into today (planned_for <= today).
    const todayTasks = onProgress.filter((t) => t.planned_for != null && t.planned_for <= today)
    const backlog = onProgress.filter((t) => t.planned_for == null || t.planned_for > today)
    const done = tasks.filter((t) => t.status === 'done')
    const doneToday = done.filter(
      (t) => t.completed_at != null && localDateISO(t.completed_at) === today,
    )
    const allDone = [...done].sort((a, b) =>
      (b.completed_at ?? '').localeCompare(a.completed_at ?? ''),
    )
    return { approval, todayTasks, backlog, doneToday, allDone }
  }, [tasks, today])

  async function setPlannedFor(task: TaskWithProject, value: string | null) {
    setActionError(null)
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ planned_for: value })
      .eq('id', task.id)
    if (updErr) setActionError("Couldn't move task. Try again.")
    // The realtime subscription in useMyTasks refetches and re-buckets the card.
  }

  async function runPending() {
    if (!pending) return
    const { task, kind } = pending
    setBusy(true)
    setActionError(null)
    const { error: opErr } =
      kind === 'complete'
        ? await supabase
            .from('tasks')
            .update({ status: 'done', completed_at: new Date().toISOString() })
            .eq('id', task.id)
        : await supabase.from('tasks').delete().eq('id', task.id)
    setBusy(false)
    setPending(null)
    if (opErr) {
      setActionError(
        kind === 'complete' ? "Couldn't mark as done. Try again." : "Couldn't delete task. Try again.",
      )
      return
    }
    // 'complete' is an UPDATE → realtime re-buckets the card live. DELETE can't be
    // matched by the pic_id filter, so refetch to drop it immediately.
    if (kind === 'delete') await refetch()
  }

  const isEmpty =
    approval.length === 0 &&
    todayTasks.length === 0 &&
    backlog.length === 0 &&
    allDone.length === 0

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Employer-only: team approvals to kickstart the day, above the personal planner. */}
      {isEmployer && (
        <section>
          <p className="text-base font-semibold text-slate-900">
            Hi, {profile?.name || 'there'} 👋
          </p>
          <Heading label="Awaiting Approval" count={pendingApprovals.tasks.length} />
          {pendingApprovals.tasks.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing awaiting approval.</p>
          ) : (
            <div className="space-y-2">
              {pendingApprovals.tasks.map((t) => (
                <PendingApprovalCard
                  key={t.id}
                  task={t}
                  onApprove={() => approvalActions.requestApprove(t)}
                  onRevise={() => approvalActions.requestRevise(t)}
                />
              ))}
            </div>
          )}
          {approvalActions.error && (
            <p className="mt-2 text-sm text-red-600">{approvalActions.error}</p>
          )}
        </section>
      )}

      {/* Always-visible primary action. */}
      <Link
        to="/tambah"
        className="sticky top-0 z-[5] flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.99]"
      >
        + Add Task
      </Link>

      {loading && <p className="pt-6 text-center text-sm text-slate-400">Loading…</p>}

      {error && (
        <p className="pt-6 text-center text-sm text-red-600">Couldn't load tasks. Try again.</p>
      )}

      {!loading && !error && isEmpty && (
        <p className="pt-10 text-center text-sm text-slate-500">
          No tasks yet. Tap + to add one.
        </p>
      )}

      {!loading && !error && (
        <>
          {/* Menunggu Approval — collapsible. */}
          {approval.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setApprovalOpen((o) => !o)}
                className="flex w-full items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                Awaiting Approval
                <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-medium text-navy">
                  {approval.length}
                </span>
                <span className={`ml-auto transition-transform ${approvalOpen ? 'rotate-180' : ''}`}>
                  ⌄
                </span>
              </button>
              {approvalOpen && (
                <div className="mt-2 space-y-2">
                  {approval.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Today. */}
          {todayTasks.length > 0 && (
            <section>
              <Heading label="Today" count={todayTasks.length} />
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={() => setPending({ task: t, kind: 'complete' })}
                    onDelete={() => setPending({ task: t, kind: 'delete' })}
                    moveAction={{
                      label: 'Move to Backlog',
                      onMove: () => void setPlannedFor(t, null),
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Backlog. */}
          {backlog.length > 0 && (
            <section>
              <Heading label="Backlog" count={backlog.length} />
              <div className="space-y-2">
                {backlog.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={() => setPending({ task: t, kind: 'complete' })}
                    onDelete={() => setPending({ task: t, kind: 'delete' })}
                    moveAction={{
                      label: 'Move to Today',
                      onMove: () => void setPlannedFor(t, today),
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Done Today + full history. */}
          {allDone.length > 0 && (
            <section>
              <Heading label="Done Today" count={doneToday.length} />
              <div className="space-y-2">
                {doneToday.length > 0 ? (
                  doneToday.map((t) => <TaskCard key={t.id} task={t} />)
                ) : (
                  <p className="text-sm text-slate-400">Nothing done today yet.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAllDone((s) => !s)}
                className="mt-3 text-sm font-medium text-sky"
              >
                {showAllDone ? 'Hide' : 'View all done'}
              </button>

              {showAllDone && (
                <div className="mt-2 space-y-2">
                  {allDone.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {actionError && <p className="text-center text-sm text-red-600">{actionError}</p>}

      {pending && (
        <ConfirmDialog
          title={
            pending.kind === 'complete'
              ? 'Mark task as done?'
              : "Delete this task? This can't be undone."
          }
          confirmLabel={pending.kind === 'complete' ? 'Done' : 'Delete'}
          danger={pending.kind === 'delete'}
          busy={busy}
          onConfirm={() => void runPending()}
          onCancel={() => setPending(null)}
        />
      )}

      <ApprovalDialogs actions={approvalActions} />
    </div>
  )
}
