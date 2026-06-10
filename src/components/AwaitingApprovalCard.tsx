import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Badge, Card, PillButton } from '@/components/ui'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { TaskWithProject } from '@/lib/types'

// "Revision N <base>": bump N if the name already starts with "Revision <k> ", else start at 1.
function revisionName(name: string): string {
  const m = name.match(/^Revision (\d+) (.*)$/)
  return m ? `Revision ${Number(m[1]) + 1} ${m[2]}` : `Revision 1 ${name}`
}

// A PIC's awaiting-approval agenda on the home screen. Renders by approval_state:
// pending (locked → retract from detail), approved (Done / Continue), revision_requested
// (+ Revision Agenda).
export function AwaitingApprovalCard({ task }: { task: TaskWithProject }) {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<'done' | 'continue' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const project = { id: task.project_id, name: task.project?.name ?? '' }

  async function complete(): Promise<boolean> {
    setBusy(true)
    setError(null)
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', task.id)
    setBusy(false)
    if (updErr) {
      setError("Couldn't complete. Try again.")
      return false
    }
    return true
  }

  async function onConfirm() {
    const kind = confirm
    const ok = await complete()
    setConfirm(null)
    if (!ok) return
    if (kind === 'continue') {
      navigate('/tambah', { state: { presetProject: project } })
    }
  }

  function startRevision() {
    navigate('/tambah', {
      state: {
        presetProject: project,
        presetName: revisionName(task.name),
        presetDescription: task.revision_note ?? '',
        closeOriginId: task.id,
      },
    })
  }

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => navigate(`/tugas/${task.id}`)}
        className="w-full text-left transition active:opacity-70"
      >
        <p className="text-sm text-sky">{task.project?.name ?? 'No project'}</p>
        <h3 className="mt-0.5 font-semibold leading-snug text-slate-900">{task.name}</h3>
        <div className="mt-1.5">
          {task.approval_state === 'pending' && <Badge tone="pending">Awaiting Approval</Badge>}
          {task.approval_state === 'approved' && <Badge tone="success">Approved</Badge>}
          {task.approval_state === 'revision_requested' && (
            <Badge tone="danger">Revision Required</Badge>
          )}
        </div>
      </button>

      {task.approval_state === 'approved' && (
        <div className="mt-3 flex justify-end gap-2">
          <PillButton variant="secondary" onClick={() => setConfirm('continue')}>
            Continue to next step
          </PillButton>
          <PillButton variant="primary" onClick={() => setConfirm('done')}>
            Done
          </PillButton>
        </div>
      )}

      {task.approval_state === 'revision_requested' && (
        <div className="mt-3 flex justify-end">
          <PillButton variant="primary" onClick={startRevision}>
            + Revision Agenda
          </PillButton>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {confirm && (
        <ConfirmDialog
          title={
            confirm === 'done'
              ? 'Mark this agenda as complete?'
              : 'Complete this and start the next step?'
          }
          confirmLabel={confirm === 'done' ? 'Complete' : 'Continue'}
          busy={busy}
          onConfirm={() => void onConfirm()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Card>
  )
}
