import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useMyTasks } from '@/hooks/useMyTasks'
import { useManagerStack } from '@/hooks/useManagerStack'
import { useApprovalActions } from '@/hooks/useApprovalActions'
import { TaskCard } from '@/components/TaskCard'
import { AwaitingApprovalCard } from '@/components/AwaitingApprovalCard'
import { ApprovalStack } from '@/components/ApprovalStack'
import { ApprovalDialogs } from '@/components/ApprovalDialogs'
import { Toast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ShortcutRail, type HomeSection } from '@/components/ShortcutRail'
import { SectionHeading } from '@/components/ui'
import { localDateISO, todayISO } from '@/lib/dates'
import type { TaskWithProject } from '@/lib/types'

// Smooth-scroll a home section into view (the rail jumps here). Sections carry
// `scroll-mt` so they land just below the frozen header.
function scrollToSection(section: HomeSection) {
  document.getElementById(`home-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function TugasSaya() {
  const { profile, effectiveRole } = useAuth()
  const { tasks, loading, error, refetch } = useMyTasks()

  // Employer-only: the "Kickstart Your Day" stack (pending approvals + overdue), live.
  const isEmployer = effectiveRole === 'employer'
  const managerStack = useManagerStack()
  const approvalActions = useApprovalActions()

  // A toast can be handed over via router state (e.g. after saving an agenda).
  const location = useLocation()
  const [toast, setToast] = useState<string | null>(
    (location.state as { toast?: string } | null)?.toast ?? null,
  )

  const [approvalOpen, setApprovalOpen] = useState(true)
  const [showAllDone, setShowAllDone] = useState(false)
  // A pending confirm: either completing an agenda or deleting it.
  const [pending, setPending] = useState<{ task: TaskWithProject; kind: 'complete' | 'delete' } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<HomeSection>('approval')

  const today = todayISO()

  // Scroll-spy: highlight the rail icon for whichever section sits near the top.
  useEffect(() => {
    if (loading || error) return
    const sections: HomeSection[] = ['approval', 'today', 'all', 'completed']
    const els = sections
      .map((s) => document.getElementById(`home-${s}`))
      .filter((el): el is HTMLElement => el != null)
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        )
        setActiveSection(topmost.target.id.replace('home-', '') as HomeSection)
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [loading, error])

  // Split the user's agenda into the four home sections (status values are unchanged;
  // planned_for / completed_at decide which bucket an on_progress / done item lands in).
  const { approval, todayTasks, backlog, doneToday, allDone } = useMemo(() => {
    const approval = tasks.filter((t) => t.status === 'awaiting_approval')
    const onProgress = tasks.filter((t) => t.status === 'on_progress')
    // Unfinished items from earlier days roll over into today (planned_for <= today).
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
    if (updErr) setActionError("Couldn't move agenda. Try again.")
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
        kind === 'complete'
          ? "Couldn't mark as complete. Try again."
          : "Couldn't delete agenda. Try again.",
      )
      return
    }
    // 'complete' is an UPDATE → realtime re-buckets the card live. DELETE can't be
    // matched by the pic_id filter, so refetch to drop it immediately.
    if (kind === 'delete') await refetch()
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <ShortcutRail
        active={activeSection}
        onJump={(s) => {
          setActiveSection(s)
          scrollToSection(s)
        }}
      />

      <div className="pb-4">
        {/* Quick add — pinned just below the floating header while content scrolls. */}
        <Link
          to="/tambah"
          className="sticky top-2 z-10 flex w-full items-center justify-center gap-2 rounded-full bg-navy py-3.5 text-base font-semibold text-white shadow-pill transition active:scale-[0.99]"
        >
          + Agenda
        </Link>

        {/* Scrollable content; right padding keeps cards clear of the shortcut rail. */}
        <div className="mt-6 space-y-6 pr-14">
          {/* Employer-only: team approvals to kickstart the day. */}
        {isEmployer && (
          <section>
            <SectionHeading label="Kickstart Your Day" count={managerStack.items.length} />
            <ApprovalStack
              items={managerStack.items}
              actions={approvalActions}
              authorId={profile?.id ?? ''}
            />
            {approvalActions.error && (
              <p className="mt-2 text-sm text-red-600">{approvalActions.error}</p>
            )}
          </section>
        )}

        {loading && <p className="pt-6 text-center text-sm text-slate-400">Loading…</p>}

        {error && (
          <p className="pt-6 text-center text-sm text-red-600">Couldn't load agenda. Try again.</p>
        )}

        {!loading && !error && (
          <>
            {/* Waiting for Approval — always shown, collapsible. */}
            <section id="home-approval" className="scroll-mt-20">
              <button
                type="button"
                onClick={() => setApprovalOpen((o) => !o)}
                className="mb-3 flex w-full items-center gap-2"
              >
                <span className="text-[17px] font-bold tracking-tight text-slate-900">
                  Waiting for Approval
                </span>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-xs font-semibold text-navy">
                  {approval.length}
                </span>
                <span
                  className={`ml-auto text-slate-400 transition-transform ${approvalOpen ? 'rotate-180' : ''}`}
                >
                  ⌄
                </span>
              </button>
              {approvalOpen &&
                (approval.length > 0 ? (
                  <div className="space-y-3">
                    {approval.map((t) => (
                      <AwaitingApprovalCard key={t.id} task={t} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Nothing awaiting approval.</p>
                ))}
            </section>

            {/* Today's Agenda. */}
            <section id="home-today" className="scroll-mt-20">
              <SectionHeading label="Today's Agenda" count={todayTasks.length} />
              {todayTasks.length > 0 ? (
                <div className="space-y-3">
                  {todayTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onComplete={() => setPending({ task: t, kind: 'complete' })}
                      onDelete={() => setPending({ task: t, kind: 'delete' })}
                      moveAction={{
                        label: 'Move to All Agenda',
                        onMove: () => void setPlannedFor(t, null),
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nothing here yet.</p>
              )}
            </section>

            {/* All Agenda (backlog). */}
            <section id="home-all" className="scroll-mt-20">
              <SectionHeading label="All Agenda" count={backlog.length} />
              {backlog.length > 0 ? (
                <div className="space-y-3">
                  {backlog.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onComplete={() => setPending({ task: t, kind: 'complete' })}
                      onDelete={() => setPending({ task: t, kind: 'delete' })}
                      moveAction={{
                        label: "Move to Today's Agenda",
                        onMove: () => void setPlannedFor(t, today),
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nothing here yet.</p>
              )}
            </section>

            {/* Completed + full history. */}
            <section id="home-completed" className="scroll-mt-20">
              <SectionHeading label="Completed" count={doneToday.length} />
              {doneToday.length > 0 ? (
                <div className="space-y-3">
                  {doneToday.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nothing done today yet.</p>
              )}

              {allDone.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAllDone((s) => !s)}
                    className="mt-3 text-sm font-medium text-sky"
                  >
                    {showAllDone ? 'Hide' : 'View all completed'}
                  </button>
                  {showAllDone && (
                    <div className="mt-2 space-y-3">
                      {allDone.map((t) => (
                        <TaskCard key={t.id} task={t} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

          {actionError && <p className="text-center text-sm text-red-600">{actionError}</p>}
        </div>
      </div>

      {pending && (
        <ConfirmDialog
          title={
            pending.kind === 'complete'
              ? 'Mark agenda as complete?'
              : "Delete this agenda? This can't be undone."
          }
          confirmLabel={pending.kind === 'complete' ? 'Complete' : 'Delete'}
          danger={pending.kind === 'delete'}
          busy={busy}
          onConfirm={() => void runPending()}
          onCancel={() => setPending(null)}
        />
      )}

      <ApprovalDialogs actions={approvalActions} />
    </>
  )
}
