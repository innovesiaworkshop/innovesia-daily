import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, TaskTag } from '@/lib/types'

// Tagged teammates on a task. Shows current tags as removable chips and an
// "+ Tag rekan" picker over profiles that aren't already the PIC or tagged.
export function TagRekan({
  taskId,
  picId,
  tags,
  reloadTags,
}: {
  taskId: string
  picId: string
  tags: TaskTag[]
  reloadTags: () => Promise<void>
}) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, role')
      .order('name')
      .then(({ data }) => setProfiles((data ?? []) as Profile[]))
  }, [])

  const taggedIds = useMemo(() => new Set(tags.map((t) => t.user_id)), [tags])
  // Exclude the PIC (already implicitly on the task) and anyone already tagged.
  const candidates = profiles.filter((p) => p.id !== picId && !taggedIds.has(p.id))

  async function addTag(userId: string) {
    setBusy(true)
    await supabase.from('task_tags').insert({ task_id: taskId, user_id: userId })
    await reloadTags()
    setBusy(false)
    setAdding(false)
  }

  async function removeTag(userId: string) {
    setBusy(true)
    await supabase.from('task_tags').delete().eq('task_id', taskId).eq('user_id', userId)
    await reloadTags()
    setBusy(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t.user_id}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky/10 py-1 pl-3 pr-2 text-sm font-medium text-navy"
          >
            {t.user?.name || 'No name'}
            <button
              type="button"
              onClick={() => void removeTag(t.user_id)}
              disabled={busy}
              aria-label={`Remove tag ${t.user?.name ?? ''}`}
              className="leading-none text-navy/60 hover:text-navy"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-sm text-slate-400">No teammates tagged yet.</p>}
      </div>

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm font-medium text-navy"
        >
          + Tag a teammate
        </button>
      )}

      {adding && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void addTag(p.id)}
              disabled={busy}
              className="block w-full border-b border-slate-100 px-3.5 py-2.5 text-left text-slate-800 last:border-b-0 active:bg-slate-50 disabled:opacity-60"
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
