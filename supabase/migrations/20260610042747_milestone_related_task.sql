-- Link a milestone to a task so the Project Timeline's "Lihat komentar" can open that
-- task's comment thread. Nullable; on task deletion the link clears (the milestone stays).

alter table public.milestones
  add column related_task_id uuid references public.tasks (id) on delete set null;
