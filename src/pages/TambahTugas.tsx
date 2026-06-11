import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import { Calendar, FileText, Folder, PencilLine, Sunrise } from 'lucide-react'
import { ProjectPicker } from '@/components/ProjectPicker'
import { BatchAddAgenda } from '@/components/BatchAddAgenda'
import { Toggle } from '@/components/Toggle'
import { Card, FloatingControlBar, SectionHeading } from '@/components/ui'
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
  const keyboardOpen = useKeyboardOpen()

  async function handleSave() {
    if (saving) return
    if (!profile || !project || name.trim().length === 0) {
      setError('Add an agenda name and pick a project first.')
      return
    }
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
    <div className="flex min-h-full flex-col gap-4 pb-28">
      {/* Title is in the shared app header; this bar carries Cancel + the Morning-DSU toggle. */}
      <FloatingControlBar
        left={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-2 py-1 text-sm font-medium text-sky"
          >
            Cancel
          </button>
        }
        right={
          <>
            <span
              className={`flex items-center gap-1.5 text-sm font-medium ${
                batch ? 'text-navy' : 'text-slate-500'
              }`}
            >
              <Sunrise className="h-4 w-4" />
              Morning DSU
            </span>
            <Toggle checked={batch} onChange={setBatch} label="Morning DSU" />
          </>
        }
      />

      {batch ? (
        <BatchAddAgenda />
      ) : (
        <>
      <Card className="p-4">
        <SectionHeading label="Agenda name" icon={<PencilLine className="h-4 w-4" />} />
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you working on?"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-navy"
        />
      </Card>

      <Card className="p-4">
        <SectionHeading label="Project" icon={<Folder className="h-4 w-4" />} />
        <ProjectPicker value={project} onChange={setProject} />
      </Card>

      <Card className="p-4">
        <SectionHeading label="Description (optional)" icon={<FileText className="h-4 w-4" />} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add any detail…"
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy"
        />
      </Card>

      <Card className="p-4">
        <SectionHeading label="Due (optional)" icon={<Calendar className="h-4 w-4" />} />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy"
        />
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Pinned above the bottom nav; hidden while the keyboard is up so it doesn't
          overlap the focused field. */}
      {!keyboardOpen && (
        <button
          type="button"
          onClick={() => void handleSave()}
          className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-20 w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 rounded-full bg-navy py-3.5 text-base font-semibold text-white shadow-pill transition active:scale-[0.99]"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
        </>
      )}
    </div>
  )
}
