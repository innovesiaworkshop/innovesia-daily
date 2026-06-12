-- Meeting agendas: a task can be a 'task' (default) or a 'meeting' with a time range.
-- Times are time-of-day (no tz) tied to the planned_for day — the app is single-region
-- (WIB) and day-scoped, so a wall-clock time avoids timezone conversion and stays correct
-- if the meeting's planned_for day changes.

alter table public.tasks
  add column agenda_type text not null default 'task' check (agenda_type in ('task', 'meeting')),
  add column start_time time,
  add column end_time   time;

-- When both times are present, end must not be before start.
alter table public.tasks
  add constraint tasks_meeting_time_order
  check (start_time is null or end_time is null or end_time >= start_time);

-- Reload PostgREST's schema cache so the new columns are queryable immediately.
notify pgrst, 'reload schema';
