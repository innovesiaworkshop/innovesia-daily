-- Close project (archive): projects can be closed (archived) and reopened.
-- Closed projects move to the "Closed Projects" section on the Projects list.
-- archived = false means an open/active project (the default).

alter table public.projects add column if not exists archived boolean not null default false;

-- Reload PostgREST's schema cache so the new column is queryable immediately.
notify pgrst, 'reload schema';
