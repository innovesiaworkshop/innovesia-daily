import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RevisionDialog } from '@/components/RevisionDialog'
import type { useApprovalActions } from '@/hooks/useApprovalActions'

// Renders the Approve / Minta Revisi confirmation modals from a useApprovalActions
// instance. Include once per screen that triggers approval actions.
export function ApprovalDialogs({
  actions,
}: {
  actions: ReturnType<typeof useApprovalActions>
}) {
  return (
    <>
      {actions.approveTarget && (
        <ConfirmDialog
          title="Approve this task?"
          confirmLabel="Approve"
          busy={actions.busy}
          onConfirm={() => void actions.confirmApprove()}
          onCancel={actions.cancel}
        />
      )}
      {actions.reviseTarget && (
        <RevisionDialog
          busy={actions.busy}
          onConfirm={(comment) => void actions.confirmRevise(comment)}
          onCancel={actions.cancel}
        />
      )}
    </>
  )
}
