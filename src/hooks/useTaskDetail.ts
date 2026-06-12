import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TaskComment, TaskDetail, TaskFile, TaskTag } from '@/lib/types'

interface TaskDetailState {
  task: TaskDetail | null
  files: TaskFile[]
  tags: TaskTag[]
  comments: TaskComment[]
  loading: boolean
  error: string | null
}

interface TaskDetailHook extends TaskDetailState {
  reloadTask: () => Promise<void>
  reloadFiles: () => Promise<void>
  reloadTags: () => Promise<void>
  addComment: (comment: TaskComment) => void
}

// Loads a single task with its project/PIC names, files, tagged teammates, and
// comments. Comments stay live via Supabase realtime (they're in the publication);
// files and tags are reloaded explicitly after the screen mutates them.
export function useTaskDetail(taskId: string | undefined): TaskDetailHook {
  const [state, setState] = useState<TaskDetailState>({
    task: null,
    files: [],
    tags: [],
    comments: [],
    loading: true,
    error: null,
  })

  const reloadTask = useCallback(async () => {
    if (!taskId) return
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, name, project_id, pic_id, start_date, due_date, status, needs_approval, ' +
          'approval_state, description, revision_note, planned_for, completed_at, ' +
          'agenda_type, start_time, end_time, ' +
          // tasks→profiles is ambiguous (pic_id + the task_tags join), so name the FK.
          'project:projects(name), pic:profiles!tasks_pic_id_fkey(name)',
      )
      .eq('id', taskId)
      .single()
    if (error) {
      setState((s) => ({ ...s, error: error.message }))
      return
    }
    // to-one embeds come back typed as arrays; cast through unknown to the real shape.
    setState((s) => ({ ...s, task: data as unknown as TaskDetail, error: null }))
  }, [taskId])

  const reloadFiles = useCallback(async () => {
    if (!taskId) return
    const { data } = await supabase
      .from('task_files')
      .select('id, task_id, kind, file_path, url, file_name')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    setState((s) => ({ ...s, files: (data ?? []) as TaskFile[] }))
  }, [taskId])

  const reloadTags = useCallback(async () => {
    if (!taskId) return
    const { data } = await supabase
      .from('task_tags')
      .select('user_id, rsvp_status, user:profiles(name)')
      .eq('task_id', taskId)
    setState((s) => ({ ...s, tags: (data ?? []) as unknown as TaskTag[] }))
  }, [taskId])

  // Optimistically append a just-posted comment, ignoring it if the realtime
  // event already delivered the same row (dedupe by id).
  const addComment = useCallback((comment: TaskComment) => {
    setState((s) =>
      s.comments.some((c) => c.id === comment.id)
        ? s
        : { ...s, comments: [...s.comments, comment] },
    )
  }, [])

  const reloadComments = useCallback(async () => {
    if (!taskId) return
    const { data } = await supabase
      .from('comments')
      .select('id, task_id, author_id, body, created_at, author:profiles(name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    setState((s) => ({ ...s, comments: (data ?? []) as unknown as TaskComment[] }))
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    let active = true

    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.all([reloadTask(), reloadFiles(), reloadTags(), reloadComments()]).then(() => {
      if (active) setState((s) => ({ ...s, loading: false }))
    })

    // Live comment thread: refetch on any change (payload omits the author join).
    const channel = supabase
      .channel(`task-${taskId}-comments`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        () => void reloadComments(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [taskId, reloadTask, reloadFiles, reloadTags, reloadComments])

  return { ...state, reloadTask, reloadFiles, reloadTags, addComment }
}
