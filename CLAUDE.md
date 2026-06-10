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
- navy #1f52a5  (primary buttons / CTAs, active, wordmark)
- sky  #14b4e8  (accents, links, secondary)
- gold #ffce0f  (highlights, pending / needs-action badges)
- cloud #d4d9dd (app canvas behind the glass)

## Design language: frosted glass (mobile-first)
- Canvas #d4d9dd with an understated low-opacity sky/navy tint behind content (NO green —
  brand palette only).
- Cards are FROSTED GLASS: semi-transparent white, a 1px translucent white top-edge highlight
  (`shadow-glass`), soft shadow, rounded-2xl/3xl. Use the `ui/Card` primitive: default = plain
  semi-opaque glass (`bg-white/80`, no blur — for scrolling lists); `blur` = `backdrop-blur-md`
  (header, swipe-stack cards, dialogs). Use backdrop-blur JUDICIOUSLY — never on long lists.
- Segmented controls + toggles use the glass-pill treatment: `bg-white/40 backdrop-blur` track,
  active segment `bg-white/80 text-navy shadow-sm` (or solid navy for the primary status control).
- Header is a translucent LIGHT glass bar with the (dark) `logo.png` + an italic "daily" wordmark
  centered; navy headers are avoided (the logo is dark). Font: Plus Jakarta Sans.
- Login: full-bleed `public/login-background.png` under a LIGHT scrim so the dark logo/navy
  wordmark/button stay legible.
- Primary CTAs stay solid navy pills for contrast. Text must stay fully legible over glass.

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

## Home ("Daily Stand-Up" — a daily planner). The top header block (title + date + "+ Agenda")
## is FROZEN (sticky); only the sections scroll. A pinned right-edge shortcut rail jumps to them.
1. "Waiting for Approval" — status=awaiting_approval. Collapsible, with a count.
2. "Today's Agenda" — status=on_progress AND planned_for <= today. Unfinished items
   from earlier days ROLL OVER into today and stay here until completed.
3. "All Agenda" (backlog) — status=on_progress AND (planned_for IS NULL OR planned_for > today).
4. "Completed" — status=done AND completed_at::date = today. RESETS DAILY: only today's
   completions show; full history is behind a "View all completed" button (completed_at desc).
Move between Today's Agenda and All Agenda by TAP (no drag): "Move to All Agenda" sets
planned_for=NULL; "Move to Today's Agenda" sets planned_for=current_date. Completing an agenda
asks for confirmation, then sets status=done + completed_at=now().
Employer home: a "Kickstart Your Day" section (all members' pending approvals) above the
personal planner.



## UI language: English. Terminology (use these exact terms):
A work item is an "agenda" (was "task"). Innovesia Daily (brand, keep) · Agenda (home nav) ·
"Daily Stand-Up" (home title) · "+ Agenda" / "New Agenda" (add) · Projects · To Review ·
Dashboard · Log out · Hi, <name> · Employee / Manager (role switcher) ·
Waiting for Approval · In Progress · Completed · Warning (derived-overdue badge) ·
Today's Agenda / All Agenda / Completed (home sections) · "Kickstart Your Day" (employer home) ·
"Move to All Agenda" / "Move to Today's Agenda" · Due · No due date · Files · Upload file ·
View file · Teammates · Tag a teammate · Comments · Request Approval · Approve ·
"Approved by manager" · Request Revision · "Revision: <name>" · My Projects / All Projects ·
New Project. Empty states like "No agenda yet.", "No projects yet."

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