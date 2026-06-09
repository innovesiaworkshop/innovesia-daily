# Project: Innovesia Daily (PWA)

## What it is
A simple, installable mobile-first PWA for our small team to log tasks, classify them
to projects, optionally request approval, and track progress. Internal, bottom-up.
The #1 rule: logging a task must take under 15 seconds. Simplicity beats features.

## Stack
- React + Vite + TypeScript, Tailwind CSS
- Supabase (@supabase/supabase-js) for DB, Google auth, storage, realtime
- PWA via vite-plugin-pwa (installable, service worker)
- OneSignal for web push
- Deploy on Vercel

## Language
ALL user-facing text is in Bahasa Indonesia. Code/comments in English.

## Brand colors (use these, set as Tailwind theme tokens)
- navy #1f52a5  (primary buttons, headers, active)
- sky  #14b4e8  (accents, links, secondary)
- gold #ffce0f  (highlights, pending/needs-action badges)
- white #ffffff (backgrounds)
Clean, flat, lots of white space. Mobile-first. No gradients.

## Roles
- employee: create projects, log tasks, tag teammates, request approval (optional),
  update own task status, comment. Sees OWN tasks on home; sees ALL members' updates
  inside a project's detail.
- employer: all of the above + approve / comment-as-revision / reject, sees everything.

## Data model (Supabase tables already created)
profiles(id, name, role) · projects(id, name, created_by) ·
tasks(id, name, project_id, pic_id, start_date, due_date, status, needs_approval, approval_state) ·
task_tags(task_id, user_id) · task_files(id, task_id, file_path, file_name) ·
comments(id, task_id, author_id, body) ·
milestones(id, project_id, label, note, related_file_path)  -- the Project Timeline

task.status: awaiting_approval | on_progress | done | blocked | revision_requested | rejected
approval is OPT-IN per task (needs_approval toggle).

## Screens (keep to these for v1)
Login · Tugas Saya (home, my tasks by status) · Tambah Tugas (single-screen form,
can create a new project inline) · Detail Tugas (status chips, due date, file upload,
tag teammates, comments, approval toggle) · Detail Proyek (all members' tasks + a
VERTICAL Project Timeline of milestones, each with label/note and "Lihat proposal" /
"Lihat komentar" links) · Perlu Tindakan (employer: pending/revision/blocked/overdue) ·
Dashboard (employer: per project, per person, summary).

## Conventions
- Use Supabase realtime for live updates.
- Default new task: pic = current user, start_date = today, needs_approval = false,
  status = on_progress (or awaiting_approval if approval requested).
- Overdue is DERIVED (due_date passed and status != done), never stored.
- After committing a feature, suggest the git commit message.