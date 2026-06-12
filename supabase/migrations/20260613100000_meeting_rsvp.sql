-- Meeting RSVP on the existing tag join: reuse task_tags for meeting invitees.
-- rsvp_status is NULL for normal CC tags; set for meeting invitees.

alter table public.task_tags
  add column rsvp_status text check (rsvp_status in ('pending', 'accepted', 'declined'));

-- Reload PostgREST's schema cache so the new column is queryable immediately.
notify pgrst, 'reload schema';
