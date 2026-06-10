// Shared domain types backed by the Supabase schema (see supabase/migrations).

export type Role = 'employee' | 'employer'

export interface Profile {
  id: string
  name: string
  role: Role
}

export interface Project {
  id: string
  name: string
}

export type TaskStatus = 'awaiting_approval' | 'on_progress' | 'done'

export type ApprovalState = 'na' | 'pending' | 'approved'

// A task row joined with its project name, as listed on the home screen.
export interface TaskWithProject {
  id: string
  name: string
  project_id: string
  due_date: string | null
  status: TaskStatus
  // Daily-planner fields: planned_for drives the Today/backlog split (null = backlog);
  // completed_at timestamps a completion so "Selesai Hari Ini" can reset each day.
  planned_for: string | null
  completed_at: string | null
  project: { name: string } | null
}

// A single task with everything the Detail Tugas screen needs.
export interface TaskDetail {
  id: string
  name: string
  project_id: string
  pic_id: string
  start_date: string
  due_date: string | null
  status: TaskStatus
  needs_approval: boolean
  approval_state: ApprovalState
  project: { name: string } | null
  pic: { name: string } | null
}

// A row in task_files; file_path points into the private 'task-files' bucket.
export interface TaskFile {
  id: string
  task_id: string
  file_path: string
  file_name: string
}

// A tagged teammate (task_tags joined with their profile name).
export interface TaskTag {
  user_id: string
  user: { name: string } | null
}

// A comment in a task's thread, joined with its author's name.
export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
  author: { name: string } | null
}

// A task surfaced in the employer's "Perlu Tindakan" queue (awaiting approval or overdue).
export interface ActionTask {
  id: string
  name: string
  project_id: string
  pic_id: string
  due_date: string | null
  status: TaskStatus
  approval_state: ApprovalState
  pic: { name: string } | null
  project: { name: string } | null
}

// A pending-approval task on the employer home section, with its files for "Lihat berkas".
export interface PendingApprovalTask {
  id: string
  name: string
  project_id: string
  pic_id: string
  pic: { name: string } | null
  project: { name: string } | null
  files: { id: string; file_path: string; file_name: string }[]
}

// A task as shown on the Detail Proyek timeline (all members' tasks), with its files
// embedded so they can be opened without entering the task.
export interface ProjectTask {
  id: string
  name: string
  status: TaskStatus
  created_at: string
  completed_at: string | null
  pic: { name: string } | null
  files: { id: string; file_path: string; file_name: string }[]
}
