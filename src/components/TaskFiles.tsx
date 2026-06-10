import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TaskFile } from '@/lib/types'

const BUCKET = 'task-files'

// Files attached to a task. Uploads to the private 'task-files' bucket and records
// a row in task_files; lists existing files with view/download via short-lived
// signed URLs (the bucket isn't public).
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

  async function handleUpload(file: File) {
    // PDF only.
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.')
      return
    }
    setUploading(true)
    setError(null)
    // Keep files namespaced per task; prefix with a timestamp to avoid collisions.
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
      .insert({ task_id: taskId, file_path: path, file_name: file.name })
    setUploading(false)
    if (insErr) {
      setError("File uploaded but couldn't be recorded. Try again.")
      return
    }
    await reloadFiles()
  }

  async function open(file: TaskFile, download: boolean) {
    const { data, error: urlErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.file_path, 60, download ? { download: file.file_name } : undefined)
    if (urlErr || !data) {
      setError("Couldn't open file. Try again.")
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <div className="space-y-2">
      {files.length === 0 && (
        <p className="text-sm text-slate-400">No files yet.</p>
      )}

      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{f.file_name}</span>
          <div className="flex shrink-0 gap-3 text-sm font-medium">
            <button type="button" onClick={() => void open(f, false)} className="text-sky">
              View
            </button>
            <button type="button" onClick={() => void open(f, true)} className="text-navy">
              Download
            </button>
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
              if (file) void handleUpload(file)
              e.target.value = '' // allow re-selecting the same file
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-navy active:bg-slate-50 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : '+ Upload PDF'}
          </button>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
