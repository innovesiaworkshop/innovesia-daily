import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

// A PDF picked in the create form but not yet uploaded (no task to attach to yet).
export interface StagedFile {
  id: number
  file: File
  displayName: string
}

// File picking for the create form: stages PDFs (with an editable display name) in parent
// state; they're uploaded + recorded as task_files only after the agenda is saved.
export function StagedFiles({
  value,
  onChange,
}: {
  value: StagedFile[]
  onChange: (next: StagedFile[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(0)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {value.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
        >
          <input
            type="text"
            value={f.displayName}
            onChange={(e) =>
              onChange(value.map((x) => (x.id === f.id ? { ...x, displayName: e.target.value } : x)))
            }
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-navy"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x.id !== f.id))}
            aria-label={`Remove ${f.displayName}`}
            className="shrink-0 text-slate-400 active:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

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
              onChange([...value, { id: nextId.current++, file, displayName: file.name }])
            }
          }
          e.target.value = '' // allow re-selecting the same file
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-navy active:bg-slate-50"
      >
        + Upload PDF
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
