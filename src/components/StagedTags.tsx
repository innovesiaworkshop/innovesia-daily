import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

// Teammate tagging for the create form. The agenda doesn't exist yet, so selections are held
// in parent state (a list of profile ids) and written as task_tags only after the save.
export function StagedTags({
  value,
  onChange,
  excludeId,
}: {
  value: string[]
  onChange: (next: string[]) => void
  excludeId?: string
}) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, role')
      .order('name')
      .then(({ data }) => setProfiles((data ?? []) as Profile[]))
  }, [])

  const selected = useMemo(() => new Set(value), [value])
  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  // Exclude the PIC (implicitly on the task) and anyone already picked.
  const candidates = profiles.filter((p) => p.id !== excludeId && !selected.has(p.id))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky/10 py-1 pl-3 pr-2 text-sm font-medium text-navy"
          >
            {byId.get(id)?.name || 'No name'}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== id))}
              aria-label="Remove teammate"
              className="leading-none text-navy/60 hover:text-navy"
            >
              ×
            </button>
          </span>
        ))}
        {value.length === 0 && <p className="text-sm text-slate-400">No teammates tagged yet.</p>}
      </div>

      {!adding && (
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-navy">
          + Tag teammate
        </button>
      )}

      {adding && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange([...value, p.id])
                setAdding(false)
              }}
              className="block w-full border-b border-slate-100 px-3.5 py-2.5 text-left text-slate-800 last:border-b-0 active:bg-slate-50"
            >
              {p.name || 'No name'}
            </button>
          ))}
          {candidates.length === 0 && (
            <p className="px-3.5 py-2.5 text-sm text-slate-400">No other teammates.</p>
          )}
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="block w-full px-3.5 py-2 text-left text-sm text-slate-500 active:bg-slate-50"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
