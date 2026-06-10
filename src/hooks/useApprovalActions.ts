import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// The minimal shape the approval handlers need; every task type structurally satisfies it.
export interface ApprovableTask {
  id: string
  name: string
  project_id: string
  pic_id: string
}

// Shared Approve / Minta Revisi handlers + dialog state, reused by Perlu Tindakan, Detail
// Tugas, and the employer home approvals section. Pass `onDone` to refresh a screen that
// isn't already kept live by its own tasks realtime (e.g. Detail Tugas → reloadTask).
export function useApprovalActions(onDone?: () => void) {
  const { profile } = useAuth()
  const [approveTarget, setApproveTarget] = useState<ApprovableTask | null>(null)
  const [reviseTarget, setReviseTarget] = useState<ApprovableTask | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cancel() {
    setApproveTarget(null)
    setReviseTarget(null)
  }

  async function confirmApprove() {
    if (!approveTarget || !profile) return
    setBusy(true)
    setError(null)
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ approval_state: 'approved', status: 'on_progress' })
      .eq('id', approveTarget.id)
    if (!updErr) {
      // Notify the PIC via a comment in their task thread.
      await supabase.from('comments').insert({
        task_id: approveTarget.id,
        author_id: profile.id,
        body: '✅ Approved by manager',
      })
    }
    setBusy(false)
    setApproveTarget(null)
    if (updErr) {
      setError("Couldn't approve task. Try again.")
      return
    }
    onDone?.()
  }

  async function confirmRevise(comment: string) {
    if (!reviseTarget || !profile) return
    setBusy(true)
    setError(null)

    // 1. New linked task for the same PIC (planned_for defaults to today).
    const { data: created, error: insErr } = await supabase
      .from('tasks')
      .insert({
        name: `Revision: ${reviseTarget.name}`,
        project_id: reviseTarget.project_id,
        pic_id: reviseTarget.pic_id,
        needs_approval: false,
        status: 'on_progress',
        approval_state: 'na',
      })
      .select('id')
      .single()

    if (insErr || !created) {
      setBusy(false)
      setError("Couldn't create revision task. Try again.")
      return
    }
    const newId = (created as { id: string }).id

    // 2. Carry the revision comment over to the new task.
    await supabase.from('comments').insert({ task_id: newId, author_id: profile.id, body: comment })

    // 3. Mark the original done.
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', reviseTarget.id)

    setBusy(false)
    setReviseTarget(null)
    if (updErr) {
      setError("Revision task created, but couldn't close the original. Try again.")
      return
    }
    onDone?.()
  }

  return {
    approveTarget,
    reviseTarget,
    requestApprove: setApproveTarget,
    requestRevise: setReviseTarget,
    cancel,
    busy,
    error,
    confirmApprove,
    confirmRevise,
  }
}
