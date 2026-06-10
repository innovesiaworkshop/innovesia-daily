import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ProjectPicker } from '@/components/ProjectPicker'
import { Toggle } from '@/components/Toggle'
import type { Project } from '@/lib/types'

export function TambahTugas() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [project, setProject] = useState<Project | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [mintaApproval, setMintaApproval] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = name.trim().length > 0 && project !== null && !saving

  async function handleSave() {
    if (!profile || !project || !canSave) return
    setSaving(true)
    setError(null)

    // Approval is opt-in (see CLAUDE.md). start_date defaults to current_date in the DB.
    const { error: insErr } = await supabase.from('tasks').insert({
      name: name.trim(),
      project_id: project.id,
      pic_id: profile.id,
      due_date: dueDate || null,
      needs_approval: mintaApproval,
      status: mintaApproval ? 'awaiting_approval' : 'on_progress',
      approval_state: mintaApproval ? 'pending' : 'na',
    })

    setSaving(false)
    if (insErr) {
      setError("Couldn't save. Try again.")
      return
    }

    // Head back home; the toast confirmation rides along in router state.
    navigate('/', { state: { toast: 'Saved ✓' } })
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-xl font-semibold text-slate-900">Add Task</h2>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Task name</label>
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

      {/* Optional details, collapsed by default to keep the form fast. */}
      <div className="rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setShowDetail((s) => !s)}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left text-sm font-medium text-slate-700"
        >
          Details (optional)
          <span className={`transition-transform ${showDetail ? 'rotate-180' : ''}`}>⌄</span>
        </button>

        {showDetail && (
          <div className="space-y-4 border-t border-slate-100 px-3.5 py-3.5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Due</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-navy"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Request Approval</p>
                <p className="text-xs text-slate-400">The task will await approval.</p>
              </div>
              <Toggle checked={mintaApproval} onChange={setMintaApproval} label="Request Approval" />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!canSave}
        className="sticky bottom-20 w-full rounded-xl bg-navy py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
