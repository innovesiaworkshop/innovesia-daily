import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProjects, type ProjectRow } from '@/hooks/useProjects'

type Scope = 'mine' | 'all'

const SEGMENTS: { scope: Scope; label: string }[] = [
  { scope: 'mine', label: 'My Projects' },
  { scope: 'all', label: 'All Projects' },
]

export function ProyekList() {
  const navigate = useNavigate()
  const { profile, effectiveRole } = useAuth()
  const { all, mine, loading, error, refetch } = useProjects(profile?.id)

  // Default scope by effective role; either role can switch.
  const [scope, setScope] = useState<Scope>(effectiveRole === 'employee' ? 'mine' : 'all')

  // Inline "new project" form (standalone — no task attached).
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function createProject() {
    const name = newName.trim()
    if (!profile || name.length === 0 || busy) return
    setBusy(true)
    setCreateError(null)
    const { error: insErr } = await supabase
      .from('projects')
      .insert({ name, created_by: profile.id, archived: false })
    setBusy(false)
    if (insErr) {
      setCreateError("Couldn't create project. Try again.")
      return
    }
    setNewName('')
    setCreating(false)
    await refetch() // show it in the list immediately
  }

  const rows = scope === 'mine' ? mine : all
  const openRows = rows.filter((p) => !p.archived)
  const closedRows = rows.filter((p) => p.archived)

  function ProjectButton({ id, name, taskCount }: ProjectRow) {
    return (
      <button
        key={id}
        type="button"
        onClick={() => navigate(`/proyek/${id}`)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition active:scale-[0.99]"
      >
        <span className="min-w-0 truncate font-semibold text-slate-900">{name}</span>
        <span className="shrink-0 text-xs text-slate-500">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pinned controls: scope toggle + create, frozen at the top while the list scrolls. */}
      <div className="sticky top-2 z-10 space-y-2.5 rounded-2xl border border-white/50 bg-white/60 p-2 shadow-glass backdrop-blur-md">
      {/* Scope toggle. */}
      <div
        role="group"
        aria-label="Project scope"
        className="flex rounded-full border border-white/50 bg-white/40 p-1 backdrop-blur"
      >
        {SEGMENTS.map(({ scope: s, label }) => {
          const active = scope === s
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setScope(s)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                active ? 'bg-white/80 text-navy shadow-sm' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Standalone project creation — no task required. */}
      {creating ? (
        <div className="space-y-2 rounded-2xl border border-white/50 bg-white/70 p-3 shadow-glass backdrop-blur">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void createProject()
            }}
            placeholder="Project name"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy"
          />
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCreating(false)
                setNewName('')
                setCreateError(null)
              }}
              disabled={busy}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 active:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void createProject()}
              disabled={busy || newName.trim().length === 0}
              className="flex-1 rounded-xl bg-navy py-2 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-navy active:bg-white/60"
        >
          <Plus className="h-4 w-4" />
          New project
        </button>
      )}
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
        <>
          {openRows.length > 0 && (
            <div className="space-y-2">
              {openRows.map((p) => (
                <ProjectButton key={p.id} {...p} />
              ))}
            </div>
          )}

          {closedRows.length > 0 && (
            <section>
              <h3 className="mb-2 mt-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Closed Projects
              </h3>
              <div className="space-y-2 opacity-70">
                {closedRows.map((p) => (
                  <ProjectButton key={p.id} {...p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
