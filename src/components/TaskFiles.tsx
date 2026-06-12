import { useRef, useState } from 'react'
import { ExternalLink, Link2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { TaskFile } from '@/lib/types'

const BUCKET = 'task-files'

// Files attached to a task. Uploads to the private 'task-files' bucket and records
// a row in task_files; lists existing files with view/download via short-lived
// signed URLs (the bucket isn't public). PICs can rename a file before attaching
// and remove attachments (storage object + task_files row).
export function TaskFiles({
  taskId,
  files,
  canUpload,
  reloadFiles,
}: {
  taskId: string
  files: TaskFile[]
  canUpload: boolean
  reloadFiles: () => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A picked-but-not-yet-uploaded file, so the user can edit its display name first.
  const [staged, setStaged] = useState<{ file: File; displayName: string } | null>(null)
  // A link being added (url + display label), mirroring the rename-before-attach flow.
  const [stagedLink, setStagedLink] = useState<{ url: string; displayName: string } | null>(null)
  const [savingLink, setSavingLink] = useState(false)
  // An attachment pending delete confirmation (file or link).
  const [pendingDelete, setPendingDelete] = useState<TaskFile | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleUpload(file: File, displayName: string) {
    setUploading(true)
    setError(null)
    // Keep files namespaced per task; prefix with a timestamp to avoid collisions.
    // The storage path uses the real filename; the display name is what we show.
    const safeName = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${taskId}/${Date.now()}-${safeName}`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
    if (upErr) {
      setUploading(false)
      setError("Couldn't upload file. Try again.")
      return
    }

    const { error: insErr } = await supabase
      .from('task_files')
      .insert({ task_id: taskId, file_path: path, file_name: displayName.trim() || file.name })
    setUploading(false)
    if (insErr) {
      setError("File uploaded but couldn't be recorded. Try again.")
      return
    }
    setStaged(null)
    await reloadFiles()
  }

  async function handleAddLink(url: string, displayName: string) {
    const trimmed = url.trim()
    if (!trimmed) return
    // Default to https:// so a bare "example.com" still opens as an absolute link.
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    setSavingLink(true)
    setError(null)
    const { error: insErr } = await supabase
      .from('task_files')
      .insert({ task_id: taskId, kind: 'link', url: href, file_name: displayName.trim() || href })
    setSavingLink(false)
    if (insErr) {
      setError("Couldn't add link. Try again.")
      return
    }
    setStagedLink(null)
    await reloadFiles()
  }

  async function runDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setError(null)
    // Links have no storage object — only files need the bucket removal.
    if (pendingDelete.kind === 'file' && pendingDelete.file_path) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([pendingDelete.file_path])
      if (rmErr) {
        setDeleting(false)
        setError("Couldn't delete file. Try again.")
        return
      }
    }
    const { error: delErr } = await supabase.from('task_files').delete().eq('id', pendingDelete.id)
    setDeleting(false)
    setPendingDelete(null)
    if (delErr) {
      setError("Couldn't delete. Try again.")
      return
    }
    await reloadFiles()
  }

  // Open a link directly; open a file via a short-lived signed URL (the bucket is private).
  async function open(file: TaskFile, download: boolean) {
    if (file.kind === 'link') {
      if (file.url) window.open(file.url, '_blank', 'noopener')
      return
    }
    const { data, error: urlErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.file_path!, 60, download ? { download: file.file_name } : undefined)
    if (urlErr || !data) {
      setError("Couldn't open file. Try again.")
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <div className="space-y-2">
      {files.length === 0 && <p className="text-sm text-slate-400">No files yet.</p>}

      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-800">
            {f.kind === 'link' && <Link2 className="h-4 w-4 shrink-0 text-sky" />}
            <span className="min-w-0 truncate">{f.file_name}</span>
          </span>
          <div className="flex shrink-0 items-center gap-3 text-sm font-medium">
            {f.kind === 'link' ? (
              <button
                type="button"
                onClick={() => void open(f, false)}
                className="flex items-center gap-1 text-sky"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <button type="button" onClick={() => void open(f, false)} className="text-sky">
                  View
                </button>
                <button type="button" onClick={() => void open(f, true)} className="text-navy">
                  Download
                </button>
              </>
            )}
            {canUpload && (
              <button
                type="button"
                onClick={() => setPendingDelete(f)}
                aria-label={`Delete ${f.file_name}`}
                className="text-slate-400 active:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {canUpload && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                if (file.type !== 'application/pdf') {
                  setError('Only PDF files are allowed.')
                } else {
                  setError(null)
                  setStaged({ file, displayName: file.name })
                }
              }
              e.target.value = '' // allow re-selecting the same file
            }}
          />

          {staged ? (
            // Editable display name before the file is attached.
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <label className="block text-xs font-medium text-slate-500">File name</label>
              <input
                type="text"
                value={staged.displayName}
                onChange={(e) => setStaged({ ...staged, displayName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStaged(null)}
                  disabled={uploading}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 active:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpload(staged.file, staged.displayName)}
                  disabled={uploading}
                  className="flex-1 rounded-lg bg-navy py-2 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
                >
                  {uploading ? 'Attaching…' : 'Attach'}
                </button>
              </div>
            </div>
          ) : stagedLink ? (
            // URL + display label before the link is attached (mirrors the file flow).
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <label className="block text-xs font-medium text-slate-500">Link URL</label>
              <input
                type="url"
                inputMode="url"
                autoFocus
                placeholder="https://…"
                value={stagedLink.url}
                onChange={(e) => setStagedLink({ ...stagedLink, url: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy"
              />
              <label className="block text-xs font-medium text-slate-500">Label</label>
              <input
                type="text"
                placeholder="Display name"
                value={stagedLink.displayName}
                onChange={(e) => setStagedLink({ ...stagedLink, displayName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStagedLink(null)}
                  disabled={savingLink}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 active:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddLink(stagedLink.url, stagedLink.displayName)}
                  disabled={savingLink || stagedLink.url.trim().length === 0}
                  className="flex-1 rounded-lg bg-navy py-2 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
                >
                  {savingLink ? 'Adding…' : 'Add link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex-1 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-navy active:bg-slate-50 disabled:opacity-60"
              >
                + Upload PDF
              </button>
              <button
                type="button"
                onClick={() => setStagedLink({ url: '', displayName: '' })}
                className="flex-1 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-navy active:bg-slate-50"
              >
                + Add link
              </button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete this ${pendingDelete.kind === 'link' ? 'link' : 'file'}? This can't be undone.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={() => void runDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
