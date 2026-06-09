-- Innovesia Daily — initial schema
-- Tables, auth trigger, RLS, private storage bucket, and realtime publication.
-- User-facing text lives in the app (Bahasa Indonesia); this file is structure only.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- profiles: one row per auth user, populated by the on_auth_user_created trigger.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  role       text not null default 'employee' check (role in ('employee', 'employer')),
  created_at timestamptz not null default now()
);

-- projects: a bucket that tasks are classified into. Anyone can create one.
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- tasks: the core unit. status is constrained; approval is opt-in via needs_approval.
-- Overdue is DERIVED in the app (due_date passed and status != done), never stored.
create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  project_id     uuid not null references public.projects (id) on delete cascade,
  pic_id         uuid not null references public.profiles (id) on delete cascade,
  start_date     date not null default current_date,
  due_date       date,
  status         text not null default 'on_progress'
                   check (status in ('awaiting_approval', 'on_progress', 'done',
                                     'blocked', 'revision_requested', 'rejected')),
  needs_approval boolean not null default false,
  -- null when approval is not requested; otherwise tracks the employer's decision.
  approval_state text check (approval_state in ('pending', 'approved',
                                                'revision_requested', 'rejected')),
  created_at     timestamptz not null default now()
);

-- task_tags: teammates tagged on a task (many-to-many).
create table public.task_tags (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, user_id)
);

-- task_files: files attached to a task; file_path points into the task-files bucket.
create table public.task_files (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  file_path  text not null,
  file_name  text not null,
  created_at timestamptz not null default now()
);

-- comments: thread on a task. Employer revisions are comments too.
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- milestones: the vertical Project Timeline. related_file_path is optional.
create table public.milestones (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  label             text not null,
  note              text,
  related_file_path text,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auth: create a profile automatically when a new auth user signs up
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Enable on every table, with permissive "any authenticated user can read/write"
-- policies. Role-based rules (employer-only approve, etc.) are enforced in-app
-- for v1 and can be tightened here later.
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.projects   enable row level security;
alter table public.tasks      enable row level security;
alter table public.task_tags  enable row level security;
alter table public.task_files enable row level security;
alter table public.comments   enable row level security;
alter table public.milestones enable row level security;

create policy "authenticated read/write" on public.profiles
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write" on public.projects
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write" on public.tasks
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write" on public.task_tags
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write" on public.task_files
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write" on public.comments
  for all to authenticated using (true) with check (true);

create policy "authenticated read/write" on public.milestones
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage: private bucket for task attachments
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', false)
on conflict (id) do nothing;

create policy "task-files authenticated read" on storage.objects
  for select to authenticated using (bucket_id = 'task-files');

create policy "task-files authenticated insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-files');

create policy "task-files authenticated update" on storage.objects
  for update to authenticated
  using (bucket_id = 'task-files') with check (bucket_id = 'task-files');

create policy "task-files authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'task-files');

-- ---------------------------------------------------------------------------
-- Realtime: stream live updates for tasks, comments, and milestones
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.milestones;
