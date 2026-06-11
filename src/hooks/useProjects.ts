import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface ProjectRow {
  id: string
  name: string
  taskCount: number
  archived: boolean
}

interface ProjectsState {
  all: ProjectRow[]
  mine: ProjectRow[]
  loading: boolean
  error: string | null
}

// Loads every project once and derives both browse scopes client-side (so the toggle is
// instant). "mine" = projects I created, own a task in, or am tagged on — keyed off the
// real user id, not the viewed role.
export function useProjects(uid: string | undefined): ProjectsState {
  const [state, setState] = useState<ProjectsState>({
    all: [],
    mine: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!uid) return
    let active = true

    async function load() {
      const [projectsRes, tasksRes, tagsRes] = await Promise.all([
        supabase.from('projects').select('id, name, created_by, archived').order('name'),
        supabase.from('tasks').select('id, project_id, pic_id'),
        supabase.from('task_tags').select('task:tasks(project_id)').eq('user_id', uid),
      ])

      if (!active) return

      if (projectsRes.error || tasksRes.error || tagsRes.error) {
        setState((s) => ({ ...s, loading: false, error: "Couldn't load projects." }))
        return
      }

      const projects = (projectsRes.data ?? []) as {
        id: string
        name: string
        created_by: string
        archived: boolean
      }[]
      const tasks = (tasksRes.data ?? []) as { project_id: string; pic_id: string }[]
      const tags = (tagsRes.data ?? []) as unknown as { task: { project_id: string } | null }[]

      // Per-project task counts, and the projects this user is involved in.
      const counts = new Map<string, number>()
      const picProjects = new Set<string>()
      for (const t of tasks) {
        counts.set(t.project_id, (counts.get(t.project_id) ?? 0) + 1)
        if (t.pic_id === uid) picProjects.add(t.project_id)
      }
      const taggedProjects = new Set(tags.map((r) => r.task?.project_id).filter(Boolean) as string[])

      const all: ProjectRow[] = projects.map((p) => ({
        id: p.id,
        name: p.name,
        taskCount: counts.get(p.id) ?? 0,
        archived: p.archived,
      }))
      const mine = all.filter((p) => {
        const created = projects.find((x) => x.id === p.id)?.created_by === uid
        return created || picProjects.has(p.id) || taggedProjects.has(p.id)
      })

      setState({ all, mine, loading: false, error: null })
    }

    setState((s) => ({ ...s, loading: true, error: null }))
    void load()

    return () => {
      active = false
    }
  }, [uid])

  return state
}
