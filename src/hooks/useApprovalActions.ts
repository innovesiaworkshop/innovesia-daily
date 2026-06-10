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

// Shared manager Approve / Request Revision handlers + dialog state, reused by Detail Tugas
// and the Home approval stack. Pass `onDone` to refresh a screen that isn't already kept live
// by its own tasks realtime (e.g. Detail Tugas → reloadTask).
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

  // Approve: keep status='awaiting_approval' so it stays in the PIC's Awaiting section as
  // "Approved" (with Done / Continue). Only the approval_state changes.
  async function confirmApprove() {
    if (!approveTarget || !profile) return
    setBusy(true)
    setError(null)
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ approval_state: 'approved' })
      .eq('id', approveTarget.id)
    if (!updErr) {
      await supabase.from('comments').insert({
        task_id: approveTarget.id,
        author_id: profile.id,
        body: '✅ Approved by manager',
      })
    }
    setBusy(false)
    setApproveTarget(null)
    if (updErr) {
      setError("Couldn't approve. Try again.")
      return
    }
    onDone?.()
  }

  // Request Revision: mark revision_requested, store the note on the task (read by the PIC's
  // "+ Revision Agenda" flow) and also as a comment in the thread.
  async function confirmRevise(comment: string) {
    if (!reviseTarget || !profile) return
    setBusy(true)
    setError(null)
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ approval_state: 'revision_requested', revision_note: comment })
      .eq('id', reviseTarget.id)
    if (!updErr) {
      await supabase
        .from('comments')
        .insert({ task_id: reviseTarget.id, author_id: profile.id, body: comment })
    }
    setBusy(false)
    setReviseTarget(null)
    if (updErr) {
      setError("Couldn't request revision. Try again.")
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
