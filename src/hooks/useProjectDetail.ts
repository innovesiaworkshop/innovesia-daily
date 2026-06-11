import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectTask } from '@/lib/types'

interface ProjectDetailState {
  project: Project | null
  tasks: ProjectTask[]
  loading: boolean
  error: string | null
}

interface ProjectDetailHook extends ProjectDetailState {
  reloadProject: () => Promise<void>
}

// Loads a project with ALL members' tasks (RLS allows reading everyone's), each task
// carrying its files for the inline-openable timeline. Tasks stay live via Supabase
// realtime so the auto-derived timeline updates as work progresses.
export function useProjectDetail(projectId: string | undefined): ProjectDetailHook {
  const [state, setState] = useState<ProjectDetailState>({
    project: null,
    tasks: [],
    loading: true,
    error: null,
  })

  const reloadProject = useCallback(async () => {
    if (!projectId) return
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, created_by, archived')
      .eq('id', projectId)
      .single()
    if (error) {
      setState((s) => ({ ...s, error: error.message }))
      return
    }
    setState((s) => ({ ...s, project: data as Project, error: null }))
  }, [projectId])

  const reloadTasks = useCallback(async () => {
    if (!projectId) return
    // tasks→profiles is ambiguous (pic_id + the task_tags join), so name the FK.
    const { data } = await supabase
      .from('tasks')
      .select(
        'id, name, status, created_at, completed_at, pic_id, ' +
          'pic:profiles!tasks_pic_id_fkey(name), files:task_files(id, file_path, file_name)',
      )
      .eq('project_id', projectId)
    setState((s) => ({ ...s, tasks: (data ?? []) as unknown as ProjectTask[] }))
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    let active = true

    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.all([reloadProject(), reloadTasks()]).then(() => {
      if (active) setState((s) => ({ ...s, loading: false }))
    })

    // Live timeline: refetch this project's tasks on any task change.
    const channel = supabase
      .channel(`project-${projectId}-tasks`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        () => void reloadTasks(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [projectId, reloadProject, reloadTasks])

  return { ...state, reloadProject }
}
