import type { TaskWithProject } from '@/lib/types'

// Local date as YYYY-MM-DD, matching how Postgres `date` columns come back as strings.
export function todayISO(): string {
  return localDateISO(new Date())
}

// The local calendar date (YYYY-MM-DD) of a Date or timestamptz string. Used to test
// whether a `completed_at` falls on the user's today.
export function localDateISO(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Overdue is DERIVED, never stored: past due and not yet done.
export function isOverdue(task: Pick<TaskWithProject, 'due_date' | 'status'>): boolean {
  return task.due_date != null && task.due_date < todayISO() && task.status !== 'done'
}

const dueFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// "12 Jun 2026" in Bahasa Indonesia; null when there's no due date.
export function formatDueDate(iso: string | null): string | null {
  if (!iso) return null
  // Parse as a local calendar date (avoid UTC shifting the day).
  const [y, m, d] = iso.split('-').map(Number)
  return dueFormatter.format(new Date(y, m - 1, d))
}

// "12 Jun 2026" from a timestamptz (e.g. completed_at) in the user's local zone.
export function formatTimestampDate(iso: string): string {
  return dueFormatter.format(new Date(iso))
}

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

// "12 Jun 14.30" for a comment timestamp (timestamptz from Postgres).
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

// "09:00–10:00" (or just "09:00") from Postgres `time` strings ('HH:MM:SS'). null when no start.
export function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start) return null
  const hm = (t: string) => t.slice(0, 5)
  return end ? `${hm(start)}–${hm(end)}` : hm(start)
}
