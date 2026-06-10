// A simple centered confirmation modal. Render it conditionally; onCancel fires on
// both the backdrop tap and the "Batal" button.
export function ConfirmDialog({
  title,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  busy = false,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  /** Style the confirm button as destructive (red) instead of navy. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-3xl border border-white/50 bg-white/80 p-5 shadow-glass backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-base font-semibold text-slate-900">{title}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 active:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50 ${
              danger ? 'bg-red-600' : 'bg-navy'
            }`}
          >
            {busy ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
