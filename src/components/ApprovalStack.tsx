import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge, Card, PillButton } from '@/components/ui'
import { formatDueDate } from '@/lib/dates'
import type { StackItem } from '@/lib/types'
import type { useApprovalActions } from '@/hooks/useApprovalActions'

function daysOverdue(due: string): number {
  const [y, m, d] = due.split('-').map(Number)
  const dueMid = new Date(y, m - 1, d).getTime()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - dueMid) / 86_400_000)
}

// The manager's "Kickstart Your Day" swipe stack: pending approvals then overdue nudges,
// one card per view (horizontal drag via embla). Approve/Request Revision use the shared
// approval actions; Nudge drops a system comment pinging the PIC.
export function ApprovalStack({
  items,
  actions,
  authorId,
}: {
  items: StackItem[]
  actions: ReturnType<typeof useApprovalActions>
  authorId: string
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start' })
  const [fileError, setFileError] = useState<string | null>(null)
  const [nudged, setNudged] = useState<Set<string>>(new Set())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [snaps, setSnaps] = useState<number[]>([])
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const onSelect = useCallback((api: NonNullable<typeof emblaApi>) => {
    setSelectedIndex(api.selectedScrollSnap())
    setCanPrev(api.canScrollPrev())
    setCanNext(api.canScrollNext())
  }, [])

  useEffect(() => {
    if (!emblaApi) return
    setSnaps(emblaApi.scrollSnapList())
    onSelect(emblaApi)
    emblaApi.on('select', onSelect).on('reInit', (api) => {
      setSnaps(api.scrollSnapList())
      onSelect(api)
    })
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  async function viewFile(item: StackItem) {
    const file = item.files[0]
    if (!file) return
    setFileError(null)
    const { data, error } = await supabase.storage
      .from('task-files')
      .createSignedUrl(file.file_path, 60)
    if (error || !data) {
      setFileError("Couldn't open file. Try again.")
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function nudge(item: StackItem) {
    await supabase.from('comments').insert({
      task_id: item.id,
      author_id: authorId,
      body: '🔔 Nudge from manager — this task is overdue',
    })
    setNudged((s) => new Set(s).add(item.id))
  }

  if (items.length === 0) {
    return (
      <Card blur className="p-5">
        <p className="text-center text-sm text-slate-500">
          All clear — nothing needs you right now.
        </p>
      </Card>
    )
  }

  return (
    <div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
        {items.map((item) => (
          <div key={`${item.kind}-${item.id}`} className="min-w-0 flex-[0_0_100%]">
            <Card blur className="p-4">
              {item.kind === 'approval' ? (
                <Badge tone="pending">Awaiting Approval</Badge>
              ) : (
                <Badge tone="danger">Overdue</Badge>
              )}
              <p className="mt-2 text-sm text-sky">{item.project?.name ?? 'No project'}</p>
              <h3 className="mt-0.5 font-semibold leading-snug text-slate-900">{item.name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">PIC: {item.pic?.name || 'No name'}</p>

              {item.kind === 'overdue' && item.due_date && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Due {formatDueDate(item.due_date)} · {daysOverdue(item.due_date)} days overdue
                </p>
              )}

              {item.kind === 'approval' && item.files.length > 0 && (
                <button
                  type="button"
                  onClick={() => void viewFile(item)}
                  className="mt-1.5 text-sm font-medium text-sky active:opacity-70"
                >
                  View file
                </button>
              )}

              <div className="mt-3 flex justify-end gap-2">
                {item.kind === 'approval' ? (
                  <>
                    <PillButton variant="secondary" onClick={() => actions.requestRevise(item)}>
                      Request Revision
                    </PillButton>
                    <PillButton variant="primary" onClick={() => actions.requestApprove(item)}>
                      Approve
                    </PillButton>
                  </>
                ) : (
                  <PillButton variant="primary" onClick={() => void nudge(item)}>
                    {nudged.has(item.id) ? 'Nudged ✓' : 'Nudge'}
                  </PillButton>
                )}
              </div>
            </Card>
          </div>
        ))}
        </div>
      </div>

      {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}

      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous"
            disabled={!canPrev}
            onClick={() => emblaApi?.scrollPrev()}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/50 bg-white/50 text-navy backdrop-blur transition active:bg-white/70 disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-1.5">
            {snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to card ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i === selectedIndex ? 'bg-navy' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next"
            disabled={!canNext}
            onClick={() => emblaApi?.scrollNext()}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/50 bg-white/50 text-navy backdrop-blur transition active:bg-white/70 disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
