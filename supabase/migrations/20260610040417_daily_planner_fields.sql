-- Daily-planner fields on tasks (see CLAUDE.md "Home sections").
-- planned_for drives the Today vs backlog split; new tasks default to today.
-- completed_at timestamps a completion so "Selesai Hari Ini" can reset each day.

alter table public.tasks
  add column planned_for  date default current_date,
  add column completed_at timestamptz;
