import { useState } from 'react'
import { ExternalLink, FileText, Link2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { TaskFile } from '@/lib/types'

const BUCKET = 'task-files'

// Open a private file via a short-lived signed URL; download adds the original name.
async function openFile(file: TaskFile, download: boolean): Promise<boolean> {
  if (!file.file_path) return false
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.file_path, 60, download ? { download: file.file_name } : undefined)
  if (error || !data) return false
  window.open(data.signedUrl, '_blank', 'noopener')
  return true
}

function openLink(file: TaskFile) {
  if (file.url) window.open(file.url, '_blank', 'noopener')
}

// Adaptive attachment control for read-only surfaces (e.g. the approval card). The label
// and behaviour depend on how many attachments (files + links) a task has. Rename/delete
// stays in the task-detail Files card — this is view-only.
export function TaskAttachments({ files }: { files: TaskFile[] }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (files.length === 0) return null

  async function handleViewFile(file: TaskFile, download = false) {
    setError(null)
    const ok = await openFile(file, download)
    if (!ok) setError("Couldn't open file. Try again.")
  }

  const triggerClass = 'mt-1.5 text-sm font-medium text-sky active:opacity-70'

  // Exactly one attachment → act directly, no modal.
  if (files.length === 1) {
    const only = files[0]
    return (
      <div>
        <button
          type="button"
          onClick={() => (only.kind === 'link' ? openLink(only) : void handleViewFile(only))}
          className={triggerClass}
        >
          {only.kind === 'link' ? 'Open link' : 'View file'}
        </button>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  // 2+ → a dismissible glass modal listing every attachment.
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        View attachments ({files.length})
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/50 bg-white/80 p-4 shadow-glass backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Attachments</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 active:bg-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-800">
                    {f.kind === 'link' ? (
                      <Link2 className="h-4 w-4 shrink-0 text-sky" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-navy" />
                    )}
                    <span className="min-w-0 truncate">{f.file_name}</span>
                  </span>
                  <div className="flex shrink-0 items-center gap-3 text-sm font-medium">
                    {f.kind === 'link' ? (
                      <button
                        type="button"
                        onClick={() => openLink(f)}
                        className="flex items-center gap-1 text-sky"
                      >
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => void handleViewFile(f)} className="text-sky">
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleViewFile(f, true)}
                          className="text-navy"
                        >
                          Download
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
