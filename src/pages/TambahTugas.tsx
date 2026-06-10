import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ProjectPicker } from '@/components/ProjectPicker'
import { BatchAddAgenda } from '@/components/BatchAddAgenda'
import { Toggle } from '@/components/Toggle'
import type { Project } from '@/lib/types'

// Pre-fill / linkage passed via router state (from Continue / + Revision Agenda).
interface AddState {
  presetProject?: Project
  presetName?: string
  presetDescription?: string
  closeOriginId?: string
}

export function TambahTugas() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const preset = (useLocation().state as AddState | null) ?? {}

  const [name, setName] = useState(preset.presetName ?? '')
  const [project, setProject] = useState<Project | null>(preset.presetProject ?? null)
  const [description, setDescription] = useState(preset.presetDescription ?? '')
  const [dueDate, setDueDate] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState(false)

  const canSave = name.trim().length > 0 && project !== null && !saving

  async function handleSave() {
    if (!profile || !project || !canSave) return
    setSaving(true)
    setError(null)

    // New agenda defaults to Today: DB gives status=on_progress, planned_for=today,
    // approval_state='na'.
    const { error: insErr } = await supabase.from('tasks').insert({
      name: name.trim(),
      project_id: project.id,
      pic_id: profile.id,
      due_date: dueDate || null,
      description: description.trim() || null,
    })
    if (insErr) {
      setSaving(false)
      setError("Couldn't save. Try again.")
      return
    }

    // Revision flow: close the original agenda now that its revision exists.
    if (preset.closeOriginId) {
      await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', preset.closeOriginId)
    }

    setSaving(false)
    navigate('/', { state: { toast: 'Saved ✓' } })
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-glass">
        <div>
          <p className="text-sm font-semibold text-slate-800">Morning DSU</p>
          <p className="text-xs text-slate-500">Add several agendas at once.</p>
        </div>
        <Toggle checked={batch} onChange={setBatch} label="Morning DSU" />
      </div>

      {batch ? (
        <BatchAddAgenda />
      ) : (
        <>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Agenda name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you working on?"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Project</label>
        <ProjectPicker value={project} onChange={setProject} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add any detail…"
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Due (optional)</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!canSave}
        className="w-full rounded-full bg-navy py-3.5 text-base font-semibold text-white shadow-pill transition active:scale-[0.99] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
        </>
      )}
    </div>
  )
}
