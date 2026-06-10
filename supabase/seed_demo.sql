-- ---------------------------------------------------------------------------
-- DEMO SEED — run this in the Supabase Dashboard → SQL Editor (it runs as admin,
-- so it bypasses RLS). Safe to re-run: it deletes its own previous demo data first.
--
-- It seeds tasks across EVERY state the app's logic cares about, all owned by your
-- account (PIC = you), and flips your role to 'employer' so the Atasan/Karyawan
-- switcher appears. Storage files can't be created from SQL — to test "Lihat berkas"
-- upload a file to any task from the Detail Tugas screen.
-- ---------------------------------------------------------------------------

do $$
declare
  me uuid;
  pa uuid;  -- project: Website Revamp
  pb uuid;  -- project: Kampanye Sosial
  t_design uuid;
begin
  -- Actor = your account (by email), falling back to the first profile.
  select p.id into me
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'innovesia.workshop@gmail.com'
  limit 1;

  if me is null then
    select id into me from public.profiles order by created_at asc limit 1;
  end if;

  if me is null then
    raise exception 'No profiles found. Sign in to the app once, then re-run this script.';
  end if;

  -- Become an employer so the view-as switcher + approval UI show.
  -- (Revert anytime: update public.profiles set role = 'employee' where id = me;)
  update public.profiles set role = 'employer' where id = me;

  -- Clean any previous demo run (cascade removes their tasks/comments/files).
  delete from public.projects where name like 'DEMO %';

  insert into public.projects (name, created_by) values ('DEMO — Website Revamp', me) returning id into pa;
  insert into public.projects (name, created_by) values ('DEMO — Kampanye Sosial', me) returning id into pb;

  -- A pending-approval task we'll also hang comments on.
  insert into public.tasks
    (name, project_id, pic_id, due_date, status, needs_approval, approval_state, planned_for)
  values
    ('Desain ulang halaman depan', pa, me, current_date + 2, 'awaiting_approval', true, 'pending', current_date)
  returning id into t_design;

  -- One row per state the screens exercise.
  insert into public.tasks
    (name, project_id, pic_id, due_date, status, needs_approval, approval_state, planned_for, completed_at)
  values
    -- Dikerjakan Hari Ini (planned for today)
    ('Implementasi header baru', pa, me, current_date + 1, 'on_progress', false, 'na', current_date, null),
    -- Semua To-Do (no planned date = backlog)
    ('Audit aksesibilitas',      pa, me, current_date + 5, 'on_progress', false, 'na', null, null),
    -- Overdue (due passed, not done; rolled into today)
    ('Setup analytics',          pa, me, current_date - 2, 'on_progress', false, 'na', current_date - 4, null),
    -- Selesai Hari Ini
    ('Riset kompetitor',         pa, me, current_date - 1, 'done', false, 'na', current_date - 1, now()),
    -- Done earlier (shows under "Lihat semua selesai" history)
    ('Wireframe awal',           pa, me, current_date - 6, 'done', false, 'na', current_date - 6, now() - interval '3 days'),
    -- Another pending approval, different project
    ('Proposal kampanye Q3',     pb, me, current_date + 3, 'awaiting_approval', true, 'pending', current_date, null),
    -- Backlog scheduled for the future
    ('Buat konten Instagram',    pb, me, current_date + 4, 'on_progress', false, 'na', current_date + 2, null),
    -- Pending approval AND overdue
    ('Kirim ke vendor',          pb, me, current_date - 1, 'awaiting_approval', true, 'pending', current_date, null);

  insert into public.comments (task_id, author_id, body) values
    (t_design, me, 'Tolong cek konsistensi warna dengan brand guideline.'),
    (t_design, me, 'Sudah siap untuk ditinjau, menunggu approval.');

  raise notice 'Demo seeded for profile %', me;
end $$;

-- ---------------------------------------------------------------------------
-- CLEANUP (run to remove all demo data):
--   delete from public.projects where name like 'DEMO %';
-- Revert your role if you like:
--   update public.profiles set role = 'employee'
--   where id = (select p.id from public.profiles p join auth.users u on u.id = p.id
--               where u.email = 'innovesia.workshop@gmail.com');
-- ---------------------------------------------------------------------------
