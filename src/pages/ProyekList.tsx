import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'

type Scope = 'mine' | 'all'

const SEGMENTS: { scope: Scope; label: string }[] = [
  { scope: 'mine', label: 'My Projects' },
  { scope: 'all', label: 'All Projects' },
]

export function ProyekList() {
  const navigate = useNavigate()
  const { profile, effectiveRole } = useAuth()
  const { all, mine, loading, error } = useProjects(profile?.id)

  // Default scope by effective role; either role can switch.
  const [scope, setScope] = useState<Scope>(effectiveRole === 'employee' ? 'mine' : 'all')

  const rows = scope === 'mine' ? mine : all

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Projects</h2>

      {/* Scope toggle. */}
      <div role="group" aria-label="Project scope" className="flex rounded-xl bg-slate-100 p-1">
        {SEGMENTS.map(({ scope: s, label }) => {
          const active = scope === s
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setScope(s)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                active ? 'bg-white text-navy shadow-sm' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {loading && <p className="pt-6 text-center text-sm text-slate-400">Loading…</p>}

      {error && (
        <p className="pt-6 text-center text-sm text-red-600">Couldn't load projects. Try again.</p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="pt-10 text-center text-sm text-slate-500">
          {scope === 'mine' ? 'No projects involve you yet.' : 'No projects yet.'}
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/proyek/${p.id}`)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition active:scale-[0.99]"
            >
              <span className="min-w-0 truncate font-semibold text-slate-900">{p.name}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {p.taskCount} {p.taskCount === 1 ? 'task' : 'tasks'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
