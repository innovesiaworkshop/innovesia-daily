import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useGoBack } from '@/hooks/useGoBack'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import { useTaskDetail } from '@/hooks/useTaskDetail'
import { useApprovalActions } from '@/hooks/useApprovalActions'
import { isOverdue, todayISO } from '@/lib/dates'
import { AgendaStatus, type AgendaStatusKey } from '@/components/AgendaStatus'
import { TaskFiles } from '@/components/TaskFiles'
import { TagRekan } from '@/components/TagRekan'
import { CommentThread } from '@/components/CommentThread'
import { ApprovalDialogs } from '@/components/ApprovalDialogs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge, Card, FloatingControlBar, PillButton, SectionHeading } from '@/components/ui'
import { Calendar, CircleDot, FileText, MessageSquare, Paperclip, UserPlus } from 'lucide-react'
import type { LayoutOutletContext } from '@/components/Layout'

// A section as its own glass card with an icon'd heading, so each block reads distinctly.
function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <SectionHeading label={label} icon={icon} />
      {children}
    </Card>
  )
}

const APPROVAL_LABEL: Record<string, string> = {
  pending: 'Waiting for Approval',
  approved: 'Approved',
  revision_requested: 'Revision Required',
}

export function DetailTugas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const goBack = useGoBack()
  const { profile, effectiveRole } = useAuth()
  const { task, files, tags, comments, loading, error, reloadTask, reloadFiles, reloadTags, addComment } =
    useTaskDetail(id)

  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const keyboardOpen = useKeyboardOpen()
  const [description, setDescription] = useState('')
  const [confirmAction, setConfirmAction] = useState<'complete' | 'ask' | 'retract' | null>(null)

  // Manager Approve / Request Revision; reloadTask refreshes the task row.
  const approval = useApprovalActions(reloadTask)

  // Keep the local description editor in sync when the task loads.
  useEffect(() => {
    setDescription(task?.description ?? '')
  }, [task?.id, task?.description])

  // Surface the agenda name as the shared app header title (cleared on leave). Back lives in
  // the FloatingControlBar below — matching the project timeline — not the header chevron.
  const { setHeader } = useOutletContext<LayoutOutletContext>()
  useEffect(() => {
    setHeader({ title: task?.name ?? null, onBack: null })
    return () => setHeader({ title: null, onBack: null })
  }, [task?.name, setHeader])

  const isPic = !!profile && !!task && profile.id === task.pic_id
  const isEmployer = effectiveRole === 'employer'
  const isTagged = useMemo(
    () => !!profile && tags.some((t) => t.user_id === profile.id),
    [profile, tags],
  )
  const canComment = isPic || isEmployer || isTagged

  const locked = task?.status === 'awaiting_approval'
  const canEdit = isPic && !locked // PIC fully edits only in the editable state

  const today = todayISO()

  async function patch(fields: Record<string, unknown>, errMsg: string): Promise<boolean> {
    if (!task) return false
    setSaving(true)
    setActionError(null)
    const { error: updErr } = await supabase.from('tasks').update(fields).eq('id', task.id)
    setSaving(false)
    if (updErr) {
      setActionError(errMsg)
      return false
    }
    await reloadTask()
    return true
  }

  function activeStatusKey(): AgendaStatusKey {
    if (!task) return 'today'
    if (task.status === 'done') return 'completed'
    if (task.planned_for != null && task.planned_for <= today) return 'today'
    return 'all'
  }

  async function setStatusKey(key: AgendaStatusKey) {
    if (key === activeStatusKey()) return
    const fields =
      key === 'today'
        ? { status: 'on_progress', planned_for: today, completed_at: null, approval_state: 'na' }
        : key === 'all'
          ? { status: 'on_progress', planned_for: null, completed_at: null, approval_state: 'na' }
          : { status: 'done', completed_at: new Date().toISOString(), approval_state: 'na' }
    await patch(fields, "Couldn't update status. Try again.")
  }

  async function runConfirm() {
    const action = confirmAction
    setConfirmAction(null)
    if (action === 'complete') {
      await patch(
        { status: 'done', completed_at: new Date().toISOString(), approval_state: 'na' },
        "Couldn't complete. Try again.",
      )
    } else if (action === 'ask') {
      await patch(
        { status: 'awaiting_approval', approval_state: 'pending' },
        "Couldn't send for approval. Try again.",
      )
    } else if (action === 'retract') {
      await patch(
        { status: 'on_progress', approval_state: 'na', planned_for: today },
        "Couldn't retract. Try again.",
      )
    }
  }

  if (loading) {
    return <p className="pt-10 text-center text-sm text-slate-400">Loading…</p>
  }
  if (error || !task) {
    return <p className="pt-10 text-center text-sm text-red-600">Couldn't load agenda. Try again.</p>
  }

  const overdue = isOverdue(task)
  const approvalBadge = APPROVAL_LABEL[task.approval_state]

  return (
    <div className="space-y-4 pb-28">
      {/* Back lives here (matching the project timeline), not in the app header. */}
      <FloatingControlBar
        left={
          <button
            type="button"
            onClick={goBack}
            className="px-2 py-1 text-sm font-medium text-sky"
          >
            ← Back
          </button>
        }
        right={null}
      />

      {/* Body header: project link + PIC + badges (the name lives in the app header). */}
      <header>
        <button
          type="button"
          onClick={() => navigate(`/proyek/${task.project_id}`)}
          className="text-sm font-medium text-sky active:opacity-70"
        >
          {task.project?.name ?? 'No project'} ›
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">PIC: {task.pic?.name || 'No name'}</span>
          {approvalBadge && (
            <Badge tone={task.approval_state === 'revision_requested' ? 'danger' : 'pending'}>
              {approvalBadge}
            </Badge>
          )}
          {overdue && <Badge tone="pending">Warning</Badge>}
        </div>
      </header>

      {/* Locked: approval actions (read-only fields). */}
      {locked && (
        <div className="rounded-2xl border border-gold/60 bg-gold/10 p-4">
          <p className="text-sm font-medium text-slate-700">This agenda is waiting for approval.</p>
          {approval.error && <p className="mt-1 text-sm text-red-600">{approval.error}</p>}
          {actionError && <p className="mt-1 text-sm text-red-600">{actionError}</p>}
          {task.approval_state === 'pending' && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {isPic && (
                <PillButton variant="secondary" onClick={() => setConfirmAction('retract')}>
                  Retract
                </PillButton>
              )}
              {isEmployer && (
                <>
                  <PillButton variant="secondary" onClick={() => approval.requestRevise(task)}>
                    Request Revision
                  </PillButton>
                  <PillButton variant="primary" onClick={() => approval.requestApprove(task)}>
                    Approve
                  </PillButton>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status — editable control or read-only label. */}
      <Field label="Status" icon={<CircleDot className="h-4 w-4" />}>
        {locked ? (
          <p className="text-sm text-slate-700">{approvalBadge}</p>
        ) : (
          <>
            <AgendaStatus
              active={activeStatusKey()}
              canEdit={canEdit}
              saving={saving}
              onSelect={(k) => void setStatusKey(k)}
            />
            {!canEdit && (
              <p className="mt-2 text-xs text-slate-400">Only the PIC can change the status.</p>
            )}
          </>
        )}
      </Field>

      {/* Due date */}
      <Field label="Due" icon={<Calendar className="h-4 w-4" />}>
        {canEdit ? (
          <input
            type="date"
            value={task.due_date ?? ''}
            disabled={saving}
            onChange={(e) => void patch({ due_date: e.target.value || null }, "Couldn't update due date. Try again.")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy disabled:opacity-60"
          />
        ) : (
          <p className="text-sm text-slate-700">{task.due_date ?? 'No due date'}</p>
        )}
      </Field>

      {/* Description */}
      <Field label="Description" icon={<FileText className="h-4 w-4" />}>
        {canEdit ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (task.description ?? '')) {
                void patch({ description: description.trim() || null }, "Couldn't update description. Try again.")
              }
            }}
            rows={3}
            placeholder="Add any detail…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {task.description || 'No description.'}
          </p>
        )}
      </Field>

      {/* Files (PDF) */}
      <Field label="Files" icon={<Paperclip className="h-4 w-4" />}>
        <TaskFiles taskId={task.id} files={files} canUpload={canEdit} reloadFiles={reloadFiles} />
      </Field>

      {/* Notify teammate (CC) */}
      <Field label="Notify teammate (CC)" icon={<UserPlus className="h-4 w-4" />}>
        {canEdit ? (
          <TagRekan taskId={task.id} picId={task.pic_id} tags={tags} reloadTags={reloadTags} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-sm text-slate-400">No teammates notified yet.</p>
            ) : (
              tags.map((t) => (
                <span
                  key={t.user_id}
                  className="rounded-full bg-sky/10 px-3 py-1 text-sm font-medium text-navy"
                >
                  {t.user?.name || 'No name'}
                </span>
              ))
            )}
          </div>
        )}
      </Field>

      {/* Comments */}
      <Field label="Comments" icon={<MessageSquare className="h-4 w-4" />}>
        <CommentThread
          taskId={task.id}
          authorId={profile?.id ?? ''}
          canComment={canComment}
          comments={comments}
          onPosted={addComment}
        />
      </Field>

      {/* Editable: completion / approval actions (PIC only). The buttons are pinned above the
          bottom nav — like the New-Agenda Save — while the hint/error stay inline. */}
      {canEdit && (
        <>
          {(actionError || (!isEmployer && files.length === 0)) && (
            <section className="space-y-1 border-t border-slate-100 pt-4">
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              {!isEmployer && files.length === 0 && (
                <p className="text-xs text-slate-400">Attach a PDF to enable approval.</p>
              )}
            </section>
          )}
          {/* Hidden while the keyboard is up so it doesn't overlap the focused field. */}
          {!keyboardOpen && (
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 gap-2">
              {!isEmployer && (
                <PillButton
                  variant="secondary"
                  fullWidth
                  disabled={files.length === 0}
                  onClick={() => setConfirmAction('ask')}
                >
                  Ask for Approval
                </PillButton>
              )}
              <PillButton variant="primary" fullWidth onClick={() => setConfirmAction('complete')}>
                Mark as Complete
              </PillButton>
            </div>
          )}
        </>
      )}

      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction === 'complete'
              ? 'Mark this agenda as complete?'
              : confirmAction === 'ask'
                ? "Send for approval? You won't be able to edit until it's reviewed."
                : 'Retract the approval request?'
          }
          confirmLabel={
            confirmAction === 'complete' ? 'Complete' : confirmAction === 'ask' ? 'Send' : 'Retract'
          }
          busy={saving}
          onConfirm={() => void runConfirm()}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <ApprovalDialogs actions={approval} />
    </div>
  )
}
