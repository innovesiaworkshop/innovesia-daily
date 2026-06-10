import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { PendingApprovalTask } from '@/lib/types'

// One team task awaiting approval on the employer home. Body taps through to the task;
// "Lihat berkas" opens its file inline (signed URL), and ✓/✗ trigger the shared approval
// actions — all stopping propagation so they don't navigate.
export function PendingApprovalCard({
  task,
  onApprove,
  onRevise,
}: {
  task: PendingApprovalTask
  onApprove: () => void
  onRevise: () => void
}) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function openFile() {
    const file = task.files[0]
    if (!file) return
    setError(null)
    const { data, error: urlErr } = await supabase.storage
      .from('task-files')
      .createSignedUrl(file.file_path, 60)
    if (urlErr || !data) {
      setError("Couldn't open file. Try again.")
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/tugas/${task.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/tugas/${task.id}`)
      }}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition active:scale-[0.99]"
    >
      <p className="text-sm text-sky">{task.project?.name ?? 'No project'}</p>
      <h3 className="mt-0.5 font-semibold leading-snug text-slate-900">{task.name}</h3>
      <p className="mt-0.5 text-xs text-slate-500">PIC: {task.pic?.name || 'No name'}</p>

      {task.files.length > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            void openFile()
          }}
          className="mt-1.5 text-sm font-medium text-sky active:opacity-70"
        >
          View file
        </button>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <div className="mt-2.5 flex justify-end gap-2 border-t border-slate-100 pt-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRevise()
          }}
          className="rounded-xl border border-navy px-3 py-1.5 text-sm font-semibold text-navy active:bg-slate-50"
        >
          ✗ Request Revision
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onApprove()
          }}
          className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white transition active:scale-[0.99]"
        >
          ✓ Approve
        </button>
      </div>
    </div>
  )
}
