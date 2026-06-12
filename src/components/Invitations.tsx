import { useState } from 'react'
import { Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useInvitations } from '@/hooks/useInvitations'
import { Card, SectionHeading } from '@/components/ui'
import { formatTimeRange, todayISO } from '@/lib/dates'

const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
function labelFor(iso: string | null): string {
  if (!iso) return ''
  if (iso === todayISO()) return 'Today'
  const [y, m, d] = iso.split('-').map(Number)
  return dateFmt.format(new Date(y, m - 1, d))
}

// Pending meeting invitations on Home. Accepting puts the meeting on the agenda; declining
// drops it. Pending invites stay OFF the agenda until accepted.
export function Invitations({ onChanged }: { onChanged: () => void }) {
  const { profile } = useAuth()
  const { invites, refetch } = useInvitations()
  const [busy, setBusy] = useState<string | null>(null)

  if (invites.length === 0) return null

  async function respond(taskId: string, status: 'accepted' | 'declined') {
    if (!profile) return
    setBusy(taskId)
    await supabase
      .from('task_tags')
      .update({ rsvp_status: status })
      .eq('task_id', taskId)
      .eq('user_id', profile.id)
    setBusy(null)
    await refetch()
    onChanged() // accepted meetings now belong on the agenda
  }

  return (
    <section>
      <SectionHeading label="Invitations" count={invites.length} icon={<Mail className="h-4 w-4" />} />
      <div className="space-y-2">
        {invites.map((inv) => {
          const range = formatTimeRange(inv.startTime, inv.endTime)
          return (
            <Card key={inv.taskId} className="p-4">
              <p className="font-semibold leading-snug text-slate-900">{inv.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {labelFor(inv.plannedFor)}
                {range ? ` · ${range}` : ''} · from {inv.organizer}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void respond(inv.taskId, 'declined')}
                  disabled={busy === inv.taskId}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 active:bg-slate-50 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => void respond(inv.taskId, 'accepted')}
                  disabled={busy === inv.taskId}
                  className="flex-1 rounded-xl bg-navy py-2 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
