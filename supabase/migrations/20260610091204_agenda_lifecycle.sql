-- Agenda lifecycle rework (see CLAUDE.md).
-- description: free-text body, editable by the PIC.
-- revision_note: the manager's revision text (Request Revision writes it here AND keeps the
--   comment); the employee's "+ Revision Agenda" flow reads it to prefill the new agenda.
-- approval_state gains 'revision_requested'.

alter table public.tasks add column if not exists description text;
alter table public.tasks add column if not exists revision_note text;

alter table public.tasks drop constraint if exists tasks_approval_state_check;
alter table public.tasks
  add constraint tasks_approval_state_check
  check (approval_state in ('na', 'pending', 'approved', 'revision_requested'));

-- Reload PostgREST's schema cache so the new columns are queryable immediately.
notify pgrst, 'reload schema';
