import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, RsvpStatus, TaskTag } from '@/lib/types'

const RSVP_BADGE: Record<RsvpStatus, { label: string; cls: string }> = {
  accepted: { label: 'Accepted', cls: 'bg-navy/10 text-navy' },
  declined: { label: 'Declined', cls: 'bg-red-100 text-red-700' },
  pending: { label: 'Pending', cls: 'bg-gold text-navy' },
}

// Meeting invitees on the agenda detail. The organizer (canInvite) adds/removes invitees and
// sees everyone's RSVP; an invitee viewer gets Accept / Decline for their own row.
export function MeetingInvitees({
  taskId,
  picId,
  tags,
  canInvite,
  viewerId,
  reloadTags,
}: {
  taskId: string
  picId: string
  tags: TaskTag[]
  canInvite: boolean
  viewerId: string
  reloadTags: () => Promise<void>
}) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!canInvite) return
    supabase
      .from('profiles')
      .select('id, name, role')
      .order('name')
      .then(({ data }) => setProfiles((data ?? []) as Profile[]))
  }, [canInvite])

  const invitedIds = useMemo(() => new Set(tags.map((t) => t.user_id)), [tags])
  const candidates = profiles.filter((p) => p.id !== picId && !invitedIds.has(p.id))
  const myInvite = tags.find((t) => t.user_id === viewerId)

  async function invite(userId: string) {
    setBusy(true)
    await supabase.from('task_tags').insert({ task_id: taskId, user_id: userId, rsvp_status: 'pending' })
    await reloadTags()
    setBusy(false)
    setAdding(false)
  }
  async function uninvite(userId: string) {
    setBusy(true)
    await supabase.from('task_tags').delete().eq('task_id', taskId).eq('user_id', userId)
    await reloadTags()
    setBusy(false)
  }
  async function setMyRsvp(status: RsvpStatus) {
    setBusy(true)
    await supabase
      .from('task_tags')
      .update({ rsvp_status: status })
      .eq('task_id', taskId)
      .eq('user_id', viewerId)
    await reloadTags()
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {tags.length === 0 && <p className="text-sm text-slate-400">No invitees yet.</p>}
        {tags.map((t) => {
          const badge = RSVP_BADGE[t.rsvp_status ?? 'pending']
          return (
            <div key={t.user_id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm text-slate-800">{t.user?.name || 'No name'}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                  {badge.label}
                </span>
                {canInvite && (
                  <button
                    type="button"
                    onClick={() => void uninvite(t.user_id)}
                    disabled={busy}
                    aria-label={`Remove ${t.user?.name ?? ''}`}
                    className="leading-none text-slate-400 hover:text-red-600"
                  >
                    ×
                  </button>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {/* Invitee viewer: respond. */}
      {myInvite && (
        <div className="flex gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => void setMyRsvp('declined')}
            disabled={busy || myInvite.rsvp_status === 'declined'}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 active:bg-slate-50 disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => void setMyRsvp('accepted')}
            disabled={busy || myInvite.rsvp_status === 'accepted'}
            className="flex-1 rounded-xl bg-navy py-2 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      )}

      {/* Organizer: add more invitees. */}
      {canInvite &&
        (adding ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {candidates.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void invite(p.id)}
                disabled={busy}
                className="block w-full border-b border-slate-100 px-3.5 py-2.5 text-left text-slate-800 last:border-b-0 active:bg-slate-50 disabled:opacity-60"
              >
                {p.name || 'No name'}
              </button>
            ))}
            {candidates.length === 0 && (
              <p className="px-3.5 py-2.5 text-sm text-slate-400">No one left to invite.</p>
            )}
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="block w-full px-3.5 py-2 text-left text-sm text-slate-500 active:bg-slate-50"
            >
              Close
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-navy">
            + Invite teammate
          </button>
        ))}
    </div>
  )
}
