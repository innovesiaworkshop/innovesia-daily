import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useGoBack } from '@/hooks/useGoBack'
import { useDelegate, type ForTarget } from '@/hooks/useDelegate'
import { Calendar, CalendarCheck, CalendarDays, FileText, Folder, PencilLine, Sunrise } from 'lucide-react'
import { ProjectPicker } from '@/components/ProjectPicker'
import { BatchAddAgenda } from '@/components/BatchAddAgenda'
import { ForToggle } from '@/components/ForToggle'
import { Toggle } from '@/components/Toggle'
import { Card, FloatingControlBar, PinnedSaveButton, SectionHeading } from '@/components/ui'
import { todayISO } from '@/lib/dates'
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
  const goBack = useGoBack()
  const preset = (useLocation().state as AddState | null) ?? {}

  const [name, setName] = useState(preset.presetName ?? '')
  const [project, setProject] = useState<Project | null>(preset.presetProject ?? null)
  const [description, setDescription] = useState(preset.presetDescription ?? '')
  const [dueDate, setDueDate] = useState('')
  // The agenda's date: defaults to today, can be backdated. Drives created_at/start_date
  // (and completed_at when "already done"). Capped at today — no future backdating.
  const [taskDate, setTaskDate] = useState(todayISO())
  const [alreadyDone, setAlreadyDone] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState(false)

  // Assistant-only: file this agenda for self or the delegate target.
  const { isAssistant, target } = useDelegate()
  const [forTarget, setForTarget] = useState<ForTarget>('self')

  async function handleSave() {
    if (saving) return
    if (!profile || !project || name.trim().length === 0) {
      setError('Add an agenda name and pick a project first.')
      return
    }
    setSaving(true)
    setError(null)

    // Local-midnight timestamp of the chosen date — overrides created_at's now() default and,
    // when "already done", doubles as completed_at (equal → cycle time = 0, never earlier).
    const [y, m, d] = taskDate.split('-').map(Number)
    const createdISO = new Date(y, m - 1, d).toISOString()
    const today = todayISO()

    // Backdate via created_at/start_date. Already-done → done now, sitting on the chosen day;
    // otherwise a normal agenda planned for today so it lands in Today's Agenda.
    const { error: insErr } = await supabase.from('tasks').insert({
      name: name.trim(),
      project_id: project.id,
      pic_id: forTarget === 'bagus' ? target.id : profile.id,
      due_date: dueDate || null,
      description: description.trim() || null,
      start_date: taskDate,
      created_at: createdISO,
      ...(alreadyDone
        ? { status: 'done', completed_at: createdISO, planned_for: taskDate }
        : { planned_for: today }),
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
            onClick={goBack}
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
      {isAssistant && (
        <ForToggle value={forTarget} onChange={setForTarget} targetLabel={target.label} />
      )}

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

      <Card className="p-4">
        <SectionHeading label="Date" icon={<CalendarDays className="h-4 w-4" />} />
        <input
          type="date"
          value={taskDate}
          max={todayISO()}
          onChange={(e) => setTaskDate(e.target.value || todayISO())}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy"
        />
        <p className="mt-1.5 text-xs text-slate-400">Backdate to log work from an earlier day.</p>

        <label className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarCheck className="h-4 w-4 text-navy" />
            Already done?
          </span>
          <Toggle checked={alreadyDone} onChange={setAlreadyDone} label="Already done" />
        </label>
        {alreadyDone && (
          <p className="mt-1.5 text-xs text-slate-400">Saves as completed on the chosen date.</p>
        )}
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <PinnedSaveButton label={saving ? 'Saving…' : 'Save'} onClick={() => void handleSave()} />
        </>
      )}
    </div>
  )
}
