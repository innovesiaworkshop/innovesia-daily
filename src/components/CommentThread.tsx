import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dates'
import type { TaskComment } from '@/lib/types'

// The task's comment thread. Posting inserts into `comments`; the live list is fed
// from the realtime subscription in useTaskDetail, so we don't refetch here.
export function CommentThread({
  taskId,
  authorId,
  canComment,
  comments,
  onPosted,
}: {
  taskId: string
  authorId: string
  canComment: boolean
  comments: TaskComment[]
  onPosted: (comment: TaskComment) => void
}) {
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post() {
    const trimmed = body.trim()
    if (!trimmed || posting) return
    setPosting(true)
    setError(null)
    // Return the inserted row (with author name) so we can show it immediately;
    // the realtime subscription reconciles it for everyone else.
    const { data, error: insErr } = await supabase
      .from('comments')
      .insert({ task_id: taskId, author_id: authorId, body: trimmed })
      .select('id, task_id, author_id, body, created_at, author:profiles(name)')
      .single()
    setPosting(false)
    if (insErr || !data) {
      setError("Couldn't send comment. Try again.")
      return
    }
    onPosted(data as unknown as TaskComment)
    setBody('')
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {c.author?.name || 'No name'}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {formatDateTime(c.created_at)}
              </span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">
              {c.body}
            </p>
          </div>
        ))}
      </div>

      {canComment ? (
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={1}
            placeholder="Write a comment…"
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy"
          />
          <button
            type="button"
            onClick={() => void post()}
            disabled={posting || body.trim().length === 0}
            className="shrink-0 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            Send
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          Only the PIC, tagged teammates, and managers can comment.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
