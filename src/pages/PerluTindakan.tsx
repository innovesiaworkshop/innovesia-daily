import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePerluTindakan } from '@/hooks/usePerluTindakan'
import { useApprovalActions } from '@/hooks/useApprovalActions'
import { ApprovalDialogs } from '@/components/ApprovalDialogs'
import { formatDueDate, isOverdue } from '@/lib/dates'
import type { ActionTask } from '@/lib/types'

function ActionCard({
  task,
  onApprove,
  onRevise,
  onOpen,
}: {
  task: ActionTask
  onApprove: () => void
  onRevise: () => void
  onOpen: () => void
}) {
  const overdue = isOverdue(task)
  const due = formatDueDate(task.due_date)
  const isPending = task.status === 'awaiting_approval'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <button type="button" onClick={onOpen} className="w-full text-left transition active:opacity-70">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-slate-900">{task.name}</h3>
          {isPending ? (
            <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-navy">
              Awaiting Approval
            </span>
          ) : (
            overdue && (
              <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-navy">
                Overdue
              </span>
            )
          )}
        </div>
        <p className="mt-0.5 text-sm text-sky">{task.project?.name ?? 'No project'}</p>
        <p className="mt-0.5 text-xs text-slate-500">PIC: {task.pic?.name || 'No name'}</p>
        <p className="mt-1 text-xs text-slate-500">{due ? `Due: ${due}` : 'No due date'}</p>
      </button>

      {/* Approve / Minta Revisi only apply to pending-approval tasks. */}
      {isPending && (
        <div className="mt-2.5 flex justify-end gap-2 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            onClick={onRevise}
            className="rounded-xl border border-navy px-3 py-1.5 text-sm font-semibold text-navy active:bg-slate-50"
          >
            Request Revision
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white transition active:scale-[0.99]"
          >
            Approve
          </button>
        </div>
      )}
    </div>
  )
}

export function PerluTindakan() {
  const { effectiveRole } = useAuth()
  const navigate = useNavigate()
  const { tasks, loading, error } = usePerluTindakan()
  const approval = useApprovalActions()

  // Gate on the effective role so the Atasan/Karyawan switcher controls access.
  if (effectiveRole !== 'employer') {
    return (
      <p className="pt-10 text-center text-sm text-slate-500">This page is for managers only.</p>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">To Review</h2>

      {loading && <p className="pt-6 text-center text-sm text-slate-400">Loading…</p>}

      {error && <p className="pt-6 text-center text-sm text-red-600">Couldn't load. Try again.</p>}

      {!loading && !error && tasks.length === 0 && (
        <p className="pt-10 text-center text-sm text-slate-500">Nothing to review.</p>
      )}

      {approval.error && <p className="text-center text-sm text-red-600">{approval.error}</p>}

      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((t) => (
            <ActionCard
              key={t.id}
              task={t}
              onOpen={() => navigate(`/tugas/${t.id}`)}
              onApprove={() => approval.requestApprove(t)}
              onRevise={() => approval.requestRevise(t)}
            />
          ))}
        </div>
      )}

      <ApprovalDialogs actions={approval} />
    </div>
  )
}
