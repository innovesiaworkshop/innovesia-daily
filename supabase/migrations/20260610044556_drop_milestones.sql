-- The Project Timeline is now auto-derived from a project's tasks, so the manual
-- milestones table is unused. Dropping it also removes its RLS policies and its
-- supabase_realtime publication membership.

drop table if exists public.milestones;
