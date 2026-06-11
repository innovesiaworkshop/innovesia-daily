import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProjectDetail } from '@/hooks/useProjectDetail'
import { TaskTimeline } from '@/components/TaskTimeline'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FloatingControlBar } from '@/components/ui'
import type { LayoutOutletContext } from '@/components/Layout'

export function DetailProyek() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, effectiveRole } = useAuth()
  const { project, tasks, loading, error, reloadProject } = useProjectDetail(id)

  // Surface the project name as the shared app-header title (back lives in the control bar).
  const { setHeader } = useOutletContext<LayoutOutletContext>()
  useEffect(() => {
    setHeader({ title: project?.name ?? null, onBack: null })
    return () => setHeader({ title: null, onBack: null })
  }, [project?.name, setHeader])

  const [confirmClose, setConfirmClose] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Close/reopen is for managers and the project's creator only.
  const canArchive =
    !!project && (effectiveRole === 'employer' || project.created_by === profile?.id)

  async function setArchived(archived: boolean) {
    if (!project) return
    setBusy(true)
    setActionError(null)
    const { error: updErr } = await supabase
      .from('projects')
      .update({ archived })
      .eq('id', project.id)
    setBusy(false)
    setConfirmClose(false)
    if (updErr) {
      setActionError("Couldn't update project. Try again.")
      return
    }
    await reloadProject()
  }

  if (loading) {
    return <p className="pt-10 text-center text-sm text-slate-400">Loading…</p>
  }

  if (error || !project) {
    return (
      <p className="pt-10 text-center text-sm text-red-600">Couldn't load project. Try again.</p>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Floating control bar, sticky just under the app header (main is the scroller). */}
      <FloatingControlBar
        left={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-2 py-1 text-sm font-medium text-sky"
          >
            ← Back
          </button>
        }
        right={
          <>
            {project.archived && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                Closed
              </span>
            )}
            {canArchive && (
              <button
                type="button"
                onClick={() => (project.archived ? void setArchived(false) : setConfirmClose(true))}
                disabled={busy}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition active:scale-95 disabled:opacity-60 ${
                  project.archived
                    ? 'bg-navy text-white shadow-pill'
                    : 'border border-slate-300/70 bg-white/60 text-slate-600'
                }`}
              >
                {project.archived ? 'Reopen' : 'Close project'}
              </button>
            )}
          </>
        }
      />
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Project Timeline
        </h3>
        <TaskTimeline tasks={tasks} />
      </section>

      {confirmClose && (
        <ConfirmDialog
          title="Close this project? It moves to Closed Projects."
          confirmLabel="Close"
          busy={busy}
          onConfirm={() => void setArchived(true)}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </div>
  )
}
