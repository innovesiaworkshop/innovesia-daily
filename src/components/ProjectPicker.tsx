
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Project } from '@/lib/types'

// Searchable project picker with inline "create new project" — never navigates away.
export function ProjectPicker({
  value,
  onChange,
}: {
  value: Project | null
  onChange: (project: Project | null) => void
}) {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .then(({ data }) => setProjects((data ?? []) as Project[]))
  }, [])

  const trimmed = query.trim()
  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase()
    return q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects
  }, [projects, trimmed])

  // Offer inline creation only when the typed name isn't already an exact match.
  const exactMatch = projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
  const canCreate = trimmed.length > 0 && !exactMatch

  async function createProject() {
    if (!profile || creating) return
    setCreating(true)
    setError(null)
    const { data, error: insErr } = await supabase
      .from('projects')
      .insert({ name: trimmed, created_by: profile.id })
      .select('id, name')
      .single()
    setCreating(false)
    if (insErr || !data) {
      setError("Couldn't create project. Try again.")
      return
    }
    const created = data as Project
    setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setQuery('')
    onChange(created)
  }

  // Selected state: compact summary with a "Ganti" affordance.
  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3">
        <span className="truncate font-medium text-slate-900">{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 text-sm font-medium text-sky"
        >
          Change
        </button>
      </div>
    )
  }

  // Search + create state.
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search or create a project…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-navy"
      />

      <div className="mt-1.5 overflow-hidden rounded-xl border border-slate-200">
        {/* Scrollable list — shows ~3 projects, the rest scroll. */}
        <div className="max-h-[8.25rem] overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p)}
              className="block w-full border-b border-slate-100 px-3.5 py-2.5 text-left text-slate-800 last:border-b-0 active:bg-slate-50"
            >
              {p.name}
            </button>
          ))}
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => void createProject()}
            disabled={creating}
            className="block w-full px-3.5 py-2.5 text-left font-medium text-navy active:bg-slate-50 disabled:opacity-60"
          >
            {creating ? 'Creating…' : `+ Create project “${trimmed}”`}
          </button>
        )}

        {filtered.length === 0 && !canCreate && (
          <p className="px-3.5 py-2.5 text-sm text-slate-400">No projects yet.</p>
        )}
      </div>

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}
