import { useState } from 'react'

// A confirmation modal that requires a revision comment. Mirrors ConfirmDialog's styling;
// onConfirm receives the typed comment. onCancel fires on backdrop tap and "Batal".
export function RevisionDialog({
  busy = false,
  onConfirm,
  onCancel,
}: {
  busy?: boolean
  onConfirm: (comment: string) => void
  onCancel: () => void
}) {
  const [comment, setComment] = useState('')
  const trimmed = comment.trim()

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-slate-900">Request Revision</p>
        <p className="mt-1 text-sm text-slate-500">
          Write a revision note. A new task will be created for the PIC.
        </p>
        <textarea
          autoFocus
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="What needs revising?"
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 active:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={busy || trimmed.length === 0}
            className="flex-1 rounded-xl bg-navy py-2.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? 'Processing…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
