import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ProjectPicker } from '@/components/ProjectPicker'
import { Card, PillButton } from '@/components/ui'
import type { Project } from '@/lib/types'

interface Row {
  id: number
  name: string
  project: Project | null
  dueDate: string
  description: string
  open: boolean
}

function emptyRow(id: number): Row {
  return { id, name: '', project: null, dueDate: '', description: '', open: false }
}

// "Morning DSU" batch entry: a list of name-first rows with optional per-row details, saved
// in one shot. Each row becomes a normal new agenda (Today, no approval/files).
export function BatchAddAgenda() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const nextId = useRef(3)
  const [rows, setRows] = useState<Row[]>([emptyRow(0), emptyRow(1), emptyRow(2)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch(id: number, fields: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...fields } : r)))
  }
  function addRow() {
    setRows((rs) => [...rs, emptyRow(nextId.current++)])
  }
  function removeRow(id: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs))
  }

  const named = rows.filter((r) => r.name.trim().length > 0)

  async function saveAll() {
    if (!profile || named.length === 0 || saving) return
    setError(null)

    // Every agenda needs a project — flag + open any named row that's missing one.
    const missing = named.filter((r) => !r.project)
    if (missing.length > 0) {
      setError('Each agenda needs a project.')
      const ids = new Set(missing.map((r) => r.id))
      setRows((rs) => rs.map((r) => (ids.has(r.id) ? { ...r, open: true } : r)))
      return
    }

    setSaving(true)
    const { error: insErr } = await supabase.from('tasks').insert(
      named.map((r) => ({
        name: r.name.trim(),
        project_id: r.project!.id,
        pic_id: profile.id,
        due_date: r.dueDate || null,
        description: r.description.trim() || null,
      })),
    )
    setSaving(false)
    if (insErr) {
      setError("Couldn't save. Try again.")
      return
    }
    const n = named.length
    navigate('/', { state: { toast: `${n} agenda${n === 1 ? '' : 's'} added` } })
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {rows.map((r) => {
        const needsProject = r.name.trim().length > 0 && !r.project
        return (
          <Card key={r.id} className="p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={r.name}
                onChange={(e) => patch(r.id, { name: e.target.value })}
                placeholder="Agenda name"
                className="min-w-0 flex-1 rounded-lg border border-white/50 bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-navy"
              />
              <button
                type="button"
                onClick={() => patch(r.id, { open: !r.open })}
                aria-label="Details"
                aria-expanded={r.open}
                className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-navy active:bg-white/60"
              >
                Details
                <span className={`ml-1 inline-block transition-transform ${r.open ? 'rotate-180' : ''}`}>
                  ⌄
                </span>
              </button>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  aria-label="Remove row"
                  className="shrink-0 grid h-8 w-8 place-items-center rounded-full text-red-500 active:bg-red-50"
                >
                  ×
                </button>
              )}
            </div>

            {/* Project is always visible (required per row), right after the name. */}
            <div className="mt-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-600">Project</label>
                {needsProject && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Project required
                  </span>
                )}
              </div>
              <ProjectPicker value={r.project} onChange={(p) => patch(r.id, { project: p })} />
            </div>

            {/* Details holds only the truly optional fields. */}
            {r.open && (
              <div className="mt-3 space-y-3 border-t border-white/40 pt-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Due (optional)</label>
                  <input
                    type="date"
                    value={r.dueDate}
                    onChange={(e) => patch(r.id, { dueDate: e.target.value })}
                    className="w-full rounded-lg border border-white/50 bg-white/70 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Description (optional)
                  </label>
                  <textarea
                    value={r.description}
                    onChange={(e) => patch(r.id, { description: e.target.value })}
                    rows={2}
                    placeholder="Add any detail…"
                    className="w-full resize-none rounded-lg border border-white/50 bg-white/70 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
              </div>
            )}
          </Card>
        )
      })}

      <PillButton variant="secondary" fullWidth onClick={addRow}>
        + Agenda
      </PillButton>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <PillButton
        variant="primary"
        fullWidth
        disabled={named.length === 0 || saving}
        onClick={() => void saveAll()}
        className="sticky bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 mt-auto"
      >
        {saving ? 'Saving…' : `Save all${named.length > 0 ? ` (${named.length})` : ''}`}
      </PillButton>
    </div>
  )
}
