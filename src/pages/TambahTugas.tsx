import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useGoBack } from '@/hooks/useGoBack'
import { useDelegate, type ForTarget } from '@/hooks/useDelegate'
import { Calendar, CalendarCheck, CalendarDays, Clock, FileText, Folder, Paperclip, PencilLine, Sunrise, UserPlus } from 'lucide-react'
import { ProjectPicker } from '@/components/ProjectPicker'
import { BatchAddAgenda } from '@/components/BatchAddAgenda'
import { ForToggle } from '@/components/ForToggle'
import { StagedTags } from '@/components/StagedTags'
import { StagedFiles, type StagedFile } from '@/components/StagedFiles'
import { Toggle } from '@/components/Toggle'
import { Card, FloatingControlBar, PinnedSaveButton, SectionHeading } from '@/components/ui'
import { ensureGeneralProjectId } from '@/lib/generalProject'
import { todayISO } from '@/lib/dates'
import type { AgendaType, Project } from '@/lib/types'

// Pre-fill / linkage passed via router state (from Continue / + Revision Agenda).
interface AddState {
  presetProject?: Project
  presetName?: string
  presetDescription?: string
  closeOriginId?: string
  /** Default the assistant "For:" toggle (e.g. the PA board opens it on the delegate target). */
  presetForTarget?: ForTarget
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
  // Teammates + PDFs are staged locally and committed after the task row exists.
  const [taggedIds, setTaggedIds] = useState<string[]>([])
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])

  // Task vs meeting. Typing "meeting" auto-selects Meeting until the user taps the chip.
  const [agendaType, setAgendaType] = useState<AgendaType>('task')
  const [typeOverridden, setTypeOverridden] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  useEffect(() => {
    if (!typeOverridden) setAgendaType(/meeting/i.test(name) ? 'meeting' : 'task')
  }, [name, typeOverridden])
  // The agenda's date: defaults to today, can be backdated. Drives created_at/start_date
  // (and completed_at when "already done"). Capped at today — no future backdating.
  const [taskDate, setTaskDate] = useState(todayISO())
  const [alreadyDone, setAlreadyDone] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState(false)

  // Assistant-only: file this agenda for self or the delegate target.
  const { isAssistant, target } = useDelegate()
  const [forTarget, setForTarget] = useState<ForTarget>(preset.presetForTarget ?? 'self')

  async function handleSave() {
    if (saving) return
    if (!profile || name.trim().length === 0) {
      setError('Add an agenda name first.')
      return
    }
    if (agendaType === 'meeting' && startTime && endTime && endTime < startTime) {
      setError('Meeting end time must be after the start time.')
      return
    }
    setSaving(true)
    setError(null)

    // No project picked → park it in the shared "General" project (reassignable later).
    const projectId = project?.id ?? (await ensureGeneralProjectId(profile.id))
    if (!projectId) {
      setSaving(false)
      setError("Couldn't save. Try again.")
      return
    }

    const today = todayISO()
    const isFuture = taskDate > today
    // Local-midnight timestamp of the chosen date (for backdating / completion).
    const [y, m, d] = taskDate.split('-').map(Number)
    const chosenMidnightISO = new Date(y, m - 1, d).toISOString()

    const picId = forTarget === 'bagus' ? target.id : profile.id

    // Date semantics:
    // • Already done (clamped ≤ today) → completed work sitting on the chosen day.
    // • Open + future → created NOW but scheduled forward (lands on that day's agenda).
    // • Open + today/past → backdated created_at, but planned for today so it still surfaces.
    const dateFields = alreadyDone
      ? {
          start_date: taskDate,
          created_at: chosenMidnightISO,
          status: 'done',
          completed_at: chosenMidnightISO,
          planned_for: taskDate,
        }
      : isFuture
        ? { start_date: taskDate, created_at: new Date().toISOString(), planned_for: taskDate }
        : { start_date: taskDate, created_at: chosenMidnightISO, planned_for: today }

    const { data: created, error: insErr } = await supabase
      .from('tasks')
      .insert({
        name: name.trim(),
        project_id: projectId,
        pic_id: picId,
        due_date: dueDate || null,
        description: description.trim() || null,
        agenda_type: agendaType,
        start_time: agendaType === 'meeting' ? startTime || null : null,
        end_time: agendaType === 'meeting' ? endTime || null : null,
        ...dateFields,
      })
      .select('id')
      .single()
    if (insErr || !created) {
      setSaving(false)
      setError("Couldn't save. Try again.")
      return
    }
    const taskId = created.id as string

    // Commit staged teammates + PDFs now that the task exists (best-effort; the agenda is saved).
    let attachmentFailed = false
    // For a meeting, tagged people are invitees (RSVP starts pending); for a task they're CC.
    const tagRows = taggedIds
      .filter((uid) => uid !== picId)
      .map((uid) => ({
        task_id: taskId,
        user_id: uid,
        ...(agendaType === 'meeting' ? { rsvp_status: 'pending' } : {}),
      }))
    if (tagRows.length > 0) {
      const { error: tagErr } = await supabase.from('task_tags').insert(tagRows)
      if (tagErr) attachmentFailed = true
    }
    for (const sf of stagedFiles) {
      const safeName = sf.file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${taskId}/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from('task-files').upload(path, sf.file)
      if (upErr) {
        attachmentFailed = true
        continue
      }
      const { error: fileErr } = await supabase
        .from('task_files')
        .insert({ task_id: taskId, file_path: path, file_name: sf.displayName.trim() || sf.file.name })
      if (fileErr) attachmentFailed = true
    }

    // Revision flow: close the original agenda now that its revision exists.
    if (preset.closeOriginId) {
      await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', preset.closeOriginId)
    }

    setSaving(false)
    navigate('/', { state: { toast: attachmentFailed ? 'Saved ✓ (some attachments failed)' : 'Saved ✓' } })
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

      {/* Task vs meeting. */}
      <div className="flex rounded-full border border-white/50 bg-white/40 p-1 backdrop-blur">
        {(['task', 'meeting'] as AgendaType[]).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={agendaType === t}
            onClick={() => {
              setAgendaType(t)
              setTypeOverridden(true)
            }}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition active:scale-[0.99] ${
              agendaType === t ? 'bg-navy text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

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
        <SectionHeading label="Project (optional)" icon={<Folder className="h-4 w-4" />} />
        <ProjectPicker value={project} onChange={setProject} />
      </Card>

      {agendaType === 'meeting' && (
        <Card className="p-4">
          <SectionHeading label="Time" icon={<Clock className="h-4 w-4" />} />
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-label="Start time"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy"
            />
            <span className="text-slate-400">–</span>
            <input
              type="time"
              value={endTime}
              min={startTime || undefined}
              onChange={(e) => setEndTime(e.target.value)}
              aria-label="End time"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy"
            />
          </div>
        </Card>
      )}

      <Card className="p-4">
        <SectionHeading
          label={agendaType === 'meeting' ? 'Invitees (optional)' : 'Tag teammates (optional)'}
          icon={<UserPlus className="h-4 w-4" />}
        />
        <StagedTags value={taggedIds} onChange={setTaggedIds} excludeId={forTarget === 'bagus' ? target.id : profile?.id} />
      </Card>

      <Card className="p-4">
        <SectionHeading label="Files (optional)" icon={<Paperclip className="h-4 w-4" />} />
        <StagedFiles value={stagedFiles} onChange={setStagedFiles} />
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
        <SectionHeading label="Date" icon={<CalendarDays className="h-4 w-4" />} />
        <input
          type="date"
          value={taskDate}
          // Completed work can't be in the future; an open task can be scheduled ahead.
          max={alreadyDone ? todayISO() : undefined}
          onChange={(e) => setTaskDate(e.target.value || todayISO())}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy"
        />
        <p className="mt-1.5 text-xs text-slate-400">
          {alreadyDone
            ? 'Saves as completed on the chosen date.'
            : 'Backdate past work, or pick a future day to schedule it.'}
        </p>

        <label className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarCheck className="h-4 w-4 text-navy" />
            Already done?
          </span>
          <Toggle
            checked={alreadyDone}
            onChange={(next) => {
              setAlreadyDone(next)
              // Can't complete a future task — clamp a scheduled date back to today.
              if (next && taskDate > todayISO()) setTaskDate(todayISO())
            }}
            label="Already done"
          />
        </label>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <PinnedSaveButton label={saving ? 'Saving…' : 'Save'} onClick={() => void handleSave()} />
        </>
      )}
    </div>
  )
}
