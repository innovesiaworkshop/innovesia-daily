-- Simplify the task model to the opt-in approval flow (see CLAUDE.md).
-- Inline CHECKs from the initial migration are auto-named <table>_<column>_check.

-- status: drop blocked / revision_requested / rejected.
alter table public.tasks drop constraint tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('awaiting_approval', 'on_progress', 'done'));

-- approval_state: replace the nullable 4-value set with na | pending | approved.
-- 'na' means "no approval involved" (the old NULL); default for plain logged work.
alter table public.tasks drop constraint tasks_approval_state_check;
update public.tasks set approval_state = 'na' where approval_state is null;
alter table public.tasks alter column approval_state set default 'na';
alter table public.tasks alter column approval_state set not null;
alter table public.tasks
  add constraint tasks_approval_state_check
  check (approval_state in ('na', 'pending', 'approved'));
