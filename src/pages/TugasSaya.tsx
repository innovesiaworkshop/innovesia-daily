import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Calendar, CheckCircle2, ChevronDown, ChevronRight, Clock, ListTodo, Sparkles, UserCog } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useDelegate } from '@/hooks/useDelegate'
import { useMyTasks } from '@/hooks/useMyTasks'
import { useManagerStack } from '@/hooks/useManagerStack'
import { useApprovalActions } from '@/hooks/useApprovalActions'
import { TaskCard } from '@/components/TaskCard'
import { AgendaTypeFilter, matchesFilter, type AgendaFilter } from '@/components/AgendaTypeFilter'
import { Invitations } from '@/components/Invitations'
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

  // Delegate-only: entry to the PA board.
  const { isAssistant, target } = useDelegate()

  // A toast can be handed over via router state (e.g. after saving an agenda).
  const location = useLocation()
  const [toast, setToast] = useState<string | null>(
    (location.state as { toast?: string } | null)?.toast ?? null,
  )

  const [approvalOpen, setApprovalOpen] = useState(true)
  // Today's Agenda defaults expanded (show all); All Agenda defaults to a peek (top item only).
  const [todayOpen, setTodayOpen] = useState(true)
  const [allOpen, setAllOpen] = useState(false)
  const [showAllDone, setShowAllDone] = useState(false)
  // Filter the Today / All Agenda lists by type (All / Agenda / Meeting).
  const [typeFilter, setTypeFilter] = useState<AgendaFilter>('all')
  // A pending confirm: either completing an agenda or deleting it.
  const [pending, setPending] = useState<{ task: TaskWithProject; kind: 'complete' | 'delete' } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<HomeSection>('approval')

  const today = todayISO()

  // Scroll-spy: highlight the rail icon for the section heading you've most recently
  // scrolled past. We measure against a line just below the header in the real scroll
  // container (`<main>`), so the active icon matches what's at the top of the content
  // area — not the section that's already scrolled away.
  useEffect(() => {
    if (loading || error) return
    const root = document.querySelector('main')
    if (!root) return
    const sections: HomeSection[] = ['approval', 'today', 'all', 'completed']
    const OFFSET = 96 // px below main's top edge where a section becomes "active"

    function update() {
      const line = root!.getBoundingClientRect().top + OFFSET
      let current: HomeSection = sections[0]
      for (const s of sections) {
        const el = document.getElementById(`home-${s}`)
        if (el && el.getBoundingClientRect().top <= line) current = s
      }
      setActiveSection(current)
    }

    update()
    root.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      root.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
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

  // The Today / All Agenda lists, narrowed by the type filter.
  const todayFiltered = todayTasks.filter((t) => matchesFilter(t.agenda_type, typeFilter))
  const backlogFiltered = backlog.filter((t) => matchesFilter(t.agenda_type, typeFilter))

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

      <div className="space-y-6 pb-4">
        {/* Delegate-only: jump to the PA board for the delegate target. */}
        {isAssistant && (
          <Link
            to="/pa"
            className="flex items-center justify-between gap-3 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-glass transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                <UserCog className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{target.label}</span>
                <span className="block text-xs text-slate-500">Manage his agenda</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </Link>
        )}

        {/* Employer-only: team approvals to kickstart the day. */}
        {isEmployer && (
          <section>
            <SectionHeading
              label="Kickstart Your Day"
              count={managerStack.items.length}
              icon={<Sparkles className="h-4 w-4" />}
            />
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

        {/* Pending meeting invitations — accepting puts the meeting on the agenda below. */}
        <Invitations onChanged={refetch} />

        {loading && <p className="pt-6 text-center text-sm text-slate-400">Loading…</p>}

        {error && (
          <p className="pt-6 text-center text-sm text-red-600">Couldn't load agenda. Try again.</p>
        )}

        {!loading && !error && (
          <>
            {/* Waiting for Approval — always shown, collapsible. */}
            <section id="home-approval" className="scroll-mt-4">
              <button
                type="button"
                onClick={() => setApprovalOpen((o) => !o)}
                className="mb-3 flex w-full items-center gap-2"
              >
                <Clock className="h-4 w-4 text-navy" />
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

            {/* Type filter — applies to Today's + All Agenda below. */}
            <AgendaTypeFilter value={typeFilter} onChange={setTypeFilter} />

            {/* Today's Agenda — peek-collapsible. */}
            <section id="home-today" className="scroll-mt-4">
              <SectionHeading
                label="Today's Agenda"
                count={todayFiltered.length}
                icon={<Calendar className="h-4 w-4" />}
                action={
                  todayFiltered.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setTodayOpen((o) => !o)}
                      aria-expanded={todayOpen}
                      aria-label={todayOpen ? 'Collapse' : 'Expand'}
                      className="text-slate-400"
                    >
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${todayOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  ) : undefined
                }
              />
              {todayFiltered.length > 0 ? (
                <div className="space-y-3">
                  {(todayOpen ? todayFiltered : todayFiltered.slice(0, 1)).map((t) => {
                    // Meetings I only attend (not own) are read-only — no actions.
                    const owned = t.pic_id === profile?.id
                    return (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onComplete={owned ? () => setPending({ task: t, kind: 'complete' }) : undefined}
                        onDelete={owned ? () => setPending({ task: t, kind: 'delete' }) : undefined}
                        moveAction={
                          owned
                            ? { label: 'Move to All Agenda', onMove: () => void setPlannedFor(t, null) }
                            : undefined
                        }
                      />
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nothing here yet.</p>
              )}
              {todayFiltered.length > 1 && (
                <button
                  type="button"
                  onClick={() => setTodayOpen((o) => !o)}
                  className="mt-2 text-sm font-medium text-sky"
                >
                  {todayOpen ? 'Show less' : `Show all (${todayFiltered.length})`}
                </button>
              )}
            </section>

            {/* All Agenda (backlog) — peek-collapsible. */}
            <section id="home-all" className="scroll-mt-4">
              <SectionHeading
                label="All Agenda"
                count={backlogFiltered.length}
                icon={<ListTodo className="h-4 w-4" />}
                action={
                  backlogFiltered.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setAllOpen((o) => !o)}
                      aria-expanded={allOpen}
                      aria-label={allOpen ? 'Collapse' : 'Expand'}
                      className="text-slate-400"
                    >
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${allOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  ) : undefined
                }
              />
              {backlogFiltered.length > 0 ? (
                <div className="space-y-3">
                  {(allOpen ? backlogFiltered : backlogFiltered.slice(0, 1)).map((t) => {
                    const owned = t.pic_id === profile?.id
                    return (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onComplete={owned ? () => setPending({ task: t, kind: 'complete' }) : undefined}
                        onDelete={owned ? () => setPending({ task: t, kind: 'delete' }) : undefined}
                        moveAction={
                          owned
                            ? { label: "Move to Today's Agenda", onMove: () => void setPlannedFor(t, today) }
                            : undefined
                        }
                      />
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nothing here yet.</p>
              )}
              {backlogFiltered.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAllOpen((o) => !o)}
                  className="mt-2 text-sm font-medium text-sky"
                >
                  {allOpen ? 'Show less' : `Show all (${backlogFiltered.length})`}
                </button>
              )}
            </section>

            {/* Completed + full history. */}
            <section id="home-completed" className="scroll-mt-4">
              <SectionHeading
                label="Completed"
                count={doneToday.length}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
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
