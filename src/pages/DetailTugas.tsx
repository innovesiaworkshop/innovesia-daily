import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTaskDetail } from '@/hooks/useTaskDetail'
import { useApprovalActions } from '@/hooks/useApprovalActions'
import { isOverdue } from '@/lib/dates'
import { StatusChips } from '@/components/StatusChips'
import { TaskFiles } from '@/components/TaskFiles'
import { TagRekan } from '@/components/TagRekan'
import { CommentThread } from '@/components/CommentThread'
import { ApprovalDialogs } from '@/components/ApprovalDialogs'
import type { TaskStatus } from '@/lib/types'

// A labelled block; keeps the screen's sections visually consistent.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
      {children}
    </section>
  )
}

const APPROVAL_LABEL: Record<string, string> = {
  pending: 'Awaiting Approval',
  approved: 'Approved',
}

export function DetailTugas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, effectiveRole } = useAuth()
  const { task, files, tags, comments, loading, error, reloadTask, reloadFiles, reloadTags, addComment } =
    useTaskDetail(id)

  const [savingStatus, setSavingStatus] = useState(false)
  const [savingDue, setSavingDue] = useState(false)
  const [followOpen, setFollowOpen] = useState(false)
  const [followName, setFollowName] = useState('')
  const [creatingFollow, setCreatingFollow] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Employer Approve / Minta Revisi; reloadTask refreshes since useTaskDetail only
  // subscribes to comments, not the task row.
  const approval = useApprovalActions(reloadTask)

  // Who is looking, and what they're allowed to do.
  const isPic = !!profile && !!task && profile.id === task.pic_id
  // Use the effective role so the employer's view-as switcher applies here too.
  const isEmployer = effectiveRole === 'employer'
  const isTagged = useMemo(
    () => !!profile && tags.some((t) => t.user_id === profile.id),
    [profile, tags],
  )
  const canComment = isPic || isEmployer || isTagged
  const canContribute = canComment // upload files / tag teammates

  async function changeStatus(next: TaskStatus) {
    if (!task || next === task.status) return
    setSavingStatus(true)
    setActionError(null)
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ status: next })
      .eq('id', task.id)
    setSavingStatus(false)
    if (updErr) {
      setActionError("Couldn't update status. Try again.")
      return
    }
    await reloadTask()
  }

  async function changeDueDate(value: string) {
    if (!task) return
    setSavingDue(true)
    setActionError(null)
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ due_date: value || null })
      .eq('id', task.id)
    setSavingDue(false)
    if (updErr) {
      setActionError("Couldn't update due date. Try again.")
      return
    }
    await reloadTask()
  }

  // "Lanjut ke langkah berikutnya": a fresh follow-on task in the same project,
  // owned by the current user (there's no link column; the name carries the cue).
  async function createFollowOn() {
    if (!task || !profile) return
    const name = followName.trim()
    if (!name || creatingFollow) return
    setCreatingFollow(true)
    setActionError(null)
    const { data, error: insErr } = await supabase
      .from('tasks')
      .insert({
        name,
        project_id: task.project_id,
        pic_id: profile.id,
        needs_approval: false,
        status: 'on_progress',
        approval_state: 'na',
      })
      .select('id')
      .single()
    setCreatingFollow(false)
    if (insErr || !data) {
      setActionError("Couldn't create follow-up task. Try again.")
      return
    }
    navigate(`/tugas/${(data as { id: string }).id}`)
  }

  if (loading) {
    return <p className="pt-10 text-center text-sm text-slate-400">Loading…</p>
  }

  if (error || !task) {
    return (
      <p className="pt-10 text-center text-sm text-red-600">
        Couldn't load task. Try again.
      </p>
    )
  }

  const overdue = isOverdue(task)
  const approvalBadge = APPROVAL_LABEL[task.approval_state]

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 text-sm font-medium text-sky"
        >
          ← Back
        </button>
        <h2 className="text-xl font-semibold leading-snug text-slate-900">{task.name}</h2>
        <button
          type="button"
          onClick={() => navigate(`/proyek/${task.project_id}`)}
          className="mt-1 text-sm font-medium text-sky active:opacity-70"
        >
          {task.project?.name ?? 'No project'} ›
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">PIC: {task.pic?.name || 'No name'}</span>
          {approvalBadge && (
            <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-navy">
              {approvalBadge}
            </span>
          )}
          {overdue && (
            <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-navy">
              Overdue
            </span>
          )}
        </div>
      </header>

      {/* Employer approval actions — only while the task is awaiting approval. */}
      {isEmployer && task.status === 'awaiting_approval' && (
        <div className="rounded-xl border border-gold/60 bg-gold/10 p-3.5">
          <p className="text-sm font-medium text-slate-700">This task is awaiting approval.</p>
          {approval.error && <p className="mt-1 text-sm text-red-600">{approval.error}</p>}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => approval.requestRevise(task)}
              className="flex-1 rounded-xl border border-navy py-2.5 text-sm font-semibold text-navy active:bg-white"
            >
              Request Revision
            </button>
            <button
              type="button"
              onClick={() => approval.requestApprove(task)}
              className="flex-1 rounded-xl bg-navy py-2.5 text-sm font-semibold text-white transition active:scale-[0.99]"
            >
              Approve
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      <Field label="Status">
        <StatusChips
          status={task.status}
          canEdit={isPic}
          saving={savingStatus}
          onChange={(s) => void changeStatus(s)}
        />
        {!isPic && (
          <p className="mt-2 text-xs text-slate-400">Only the PIC can change the status.</p>
        )}
      </Field>

      {/* Due date */}
      <Field label="Due">
        {isPic ? (
          <input
            type="date"
            value={task.due_date ?? ''}
            disabled={savingDue}
            onChange={(e) => void changeDueDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy disabled:opacity-60"
          />
        ) : (
          <p className="text-sm text-slate-700">{task.due_date ?? 'No due date'}</p>
        )}
      </Field>

      {/* Files */}
      <Field label="Files">
        <TaskFiles
          taskId={task.id}
          files={files}
          canUpload={canContribute}
          reloadFiles={reloadFiles}
        />
      </Field>

      {/* Tagged teammates */}
      <Field label="Teammates">
        {canContribute ? (
          <TagRekan taskId={task.id} picId={task.pic_id} tags={tags} reloadTags={reloadTags} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-sm text-slate-400">No teammates tagged yet.</p>
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
      <Field label="Comments">
        <CommentThread
          taskId={task.id}
          authorId={profile?.id ?? ''}
          canComment={canComment}
          comments={comments}
          onPosted={addComment}
        />
      </Field>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {/* Follow-on task */}
      {canContribute && (
        <section className="border-t border-slate-100 pt-4">
          {!followOpen ? (
            <button
              type="button"
              onClick={() => {
                setFollowName(`Follow-up: ${task.name}`)
                setFollowOpen(true)
              }}
              className="w-full rounded-xl border border-navy py-3 text-sm font-semibold text-navy active:bg-slate-50"
            >
              Continue to next step →
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Follow-up task name
              </label>
              <input
                type="text"
                autoFocus
                value={followName}
                onChange={(e) => setFollowName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-navy"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFollowOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 active:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void createFollowOn()}
                  disabled={creatingFollow || followName.trim().length === 0}
                  className="flex-1 rounded-xl bg-navy py-3 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
                >
                  {creatingFollow ? 'Creating…' : 'Create task'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <ApprovalDialogs actions={approval} />
    </div>
  )
}
