import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CommentThread } from '@/components/CommentThread'
import type { TaskComment } from '@/lib/types'

// Inline comment thread for a single timeline node. Self-loads the task's comments and
// stays live via realtime (only mounts when the node is expanded), then hands off to the
// shared CommentThread for rendering + posting. Mirrors useTaskDetail's comment wiring.
export function TimelineComments({
  taskId,
  authorId,
  canComment,
}: {
  taskId: string
  authorId: string
  canComment: boolean
}) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      const { data } = await supabase
        .from('comments')
        .select('id, task_id, author_id, body, created_at, author:profiles(name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (!active) return
      setComments((data ?? []) as unknown as TaskComment[])
      setLoading(false)
    }

    void load()

    const channel = supabase
      .channel(`tl-task-${taskId}-comments`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        () => void load(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [taskId])

  // Optimistically append the just-posted comment, deduped by id (realtime also delivers it).
  function onPosted(comment: TaskComment) {
    setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]))
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <CommentThread
      taskId={taskId}
      authorId={authorId}
      canComment={canComment}
      comments={comments}
      onPosted={onPosted}
    />
  )
}
