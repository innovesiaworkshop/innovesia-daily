import { useNavigate, useParams } from 'react-router-dom'
import { useProjectDetail } from '@/hooks/useProjectDetail'
import { TaskTimeline } from '@/components/TaskTimeline'

export function DetailProyek() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { project, tasks, loading, error } = useProjectDetail(id)

  if (loading) {
    return <p className="pt-10 text-center text-sm text-slate-400">Loading…</p>
  }

  if (error || !project) {
    return (
      <p className="pt-10 text-center text-sm text-red-600">Couldn't load project. Try again.</p>
    )
  }

  return (
    <div className="space-y-6 pb-4">
      <header>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 text-sm font-medium text-sky"
        >
          ← Back
        </button>
        <h2 className="text-xl font-semibold leading-snug text-slate-900">{project.name}</h2>
      </header>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Project Timeline
        </h3>
        <TaskTimeline tasks={tasks} />
      </section>
    </div>
  )
}
