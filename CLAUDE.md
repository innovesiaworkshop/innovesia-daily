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
ALL user-facing text is in English (see the terminology glossary below). Code/comments in English.

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
- employer: all of the above + approve / request revision, sees everything.

## Data model (Supabase tables already created)
profiles(id, name, role) · projects(id, name, created_by) ·
tasks(id, name, project_id, pic_id, start_date, due_date, status, needs_approval, approval_state,
      planned_for, completed_at) ·
task_tags(task_id, user_id) · task_files(id, task_id, file_path, file_name) ·
comments(id, task_id, author_id, body) ·
milestones(id, project_id, label, note, related_file_path)  -- the Project Timeline

task.status: awaiting_approval | on_progress | done
task.approval_state: na | pending | approved  (default na)
approval is OPT-IN per task (needs_approval toggle): plain logged work is
needs_approval=false, status=on_progress, approval_state=na. Requesting approval ->
status=awaiting_approval, approval_state=pending; employer approval -> approval_state=approved.
A revision is NOT a status: the employer creates a NEW linked task "Revisi: <name>" for the
same PIC/project, carries the comment over, and marks the original done. There is no rejected.

task.planned_for: date (default current_date) — which day a task is scheduled for. NULL = backlog.
task.completed_at: timestamptz — set to now() when a task is marked done; powers the daily reset.

## Home sections (Tugas Saya — a daily planner, in this top-to-bottom order)
1. "Menunggu Approval" — status=awaiting_approval. Collapsible, with a count.
2. "Dikerjakan Hari Ini" — status=on_progress AND planned_for <= today. Unfinished tasks
   from earlier days ROLL OVER into today and stay here until done.
3. "Semua To-Do" (backlog) — status=on_progress AND (planned_for IS NULL OR planned_for > today).
4. "Selesai Hari Ini" — status=done AND completed_at::date = today. "Done" RESETS DAILY:
   only today's completions show; full history is behind a "Lihat semua selesai" button
   (all done tasks, completed_at desc, each with its completion date).
Move between Today and backlog by TAP (no drag): "Pindah ke To-Do" sets planned_for=NULL;
"Kerjakan hari ini" sets planned_for=current_date. Completing a task asks for confirmation,
then sets status=done + completed_at=now().



## UI language: English. Terminology (use these exact terms):
Innovesia Daily (brand, keep) · Tasks (nav) · "My Day" (home) · Add Task · Projects ·
To Review (was Perlu Tindakan) · Dashboard · Log out · Hi, <name> ·
Employee / Manager (role switcher) · Awaiting Approval · In Progress · Done · Overdue ·
Today / Backlog / Done Today (home sections) · "Move to Backlog" / "Move to Today" ·
Due · No due date · Files · Upload file · View file · Teammates · Tag a teammate ·
Comments · Request Approval · Approve · "Approved by manager" · Request Revision ·
"Revision: <name>" · My Projects / All Projects · Closed Projects · New Project.
Empty states like "No tasks yet.", "No projects yet."

## Conventions
- Use Supabase realtime for live updates.
- Default new task: pic = current user, start_date = today, planned_for = today (column
  default, so new tasks land in "Dikerjakan Hari Ini"), needs_approval = false,
  status = on_progress (or awaiting_approval if approval requested).
- Overdue is DERIVED (due_date passed and status != done), never stored.
- Role-gated UI must read the EFFECTIVE role from useAuth (`effectiveRole`), not
  `profile.role`. effectiveRole = `viewAsRole ?? profile.role`.
- Role switcher (testing aid): employers get a "Karyawan / Atasan" header toggle that
  sets an in-memory `viewAsRole`. It's client-side only, employer-only, resets on
  reload, and grants NO extra DB access — RLS is unchanged, so an employer viewing as
  "Karyawan" still has employer rights at the database. Review before wider rollout.
- After committing a feature, suggest the git commit message.