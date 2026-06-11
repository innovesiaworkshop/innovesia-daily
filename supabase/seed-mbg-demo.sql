-- ---------------------------------------------------------------------------
-- YAYASAN MBG — DEMO SEED
-- Paste into the MBG Supabase Dashboard → SQL Editor (runs as admin, bypasses RLS).
-- Safe to re-run: it deletes its own previous demo data first (the "DEMO — " projects
-- cascade to their agendas + comments). Storage files can't be seeded from SQL.
--
-- Uses the two REAL profile IDs that already exist in the MBG database. The guard below
-- aborts loudly if either is missing, so running this against the wrong database fails
-- before inserting anything (rather than half-seeding on a foreign-key error).
-- ---------------------------------------------------------------------------

do $$
declare
  -- Real MBG profiles.
  fiter uuid := '09a34321-18ed-41b9-bce1-40a29a14b932';  -- Fiter Bagus Cahyono
  admin uuid := 'af1e98fc-4bb9-48c5-ba35-702457a47c5b';  -- Admin Innovesia

  -- Project ids, captured on insert.
  p_dist  uuid;  -- Distribusi Makan Bergizi Zona A
  p_dapur uuid;  -- Laporan Dapur Mingguan
  p_audit uuid;  -- Audit Gizi Sekolah
  p_pasok uuid;  -- Koordinasi Pemasok Bahan

  t_audit_sd03 uuid;  -- the pending-approval agenda we hang comments on
begin
  -- Guard: both demo profiles must exist in THIS database.
  if not exists (select 1 from public.profiles where id = fiter) then
    raise exception 'Profile % (Fiter) not found — are you connected to the MBG database?', fiter;
  end if;
  if not exists (select 1 from public.profiles where id = admin) then
    raise exception 'Profile % (Admin) not found — are you connected to the MBG database?', admin;
  end if;

  -- ROLE CHANGE (intentional): make BOTH profiles 'employer' so each gets the
  -- Employee/Manager view switcher + the manager approval UI. Change later with:
  --   update public.profiles set role = 'employee' where id in (<id>, ...);
  update public.profiles set role = 'employer' where id in (fiter, admin);

  -- Clean any previous demo run (cascade removes their agendas + comments).
  delete from public.projects where name like 'DEMO — %';

  -- 4 demo projects (Makan Bergizi Gratis context), created by Fiter.
  insert into public.projects (name, created_by) values
    ('DEMO — Distribusi Makan Bergizi Zona A', fiter) returning id into p_dist;
  insert into public.projects (name, created_by) values
    ('DEMO — Laporan Dapur Mingguan', fiter) returning id into p_dapur;
  insert into public.projects (name, created_by) values
    ('DEMO — Audit Gizi Sekolah', fiter) returning id into p_audit;
  insert into public.projects (name, created_by) values
    ('DEMO — Koordinasi Pemasok Bahan', fiter) returning id into p_pasok;

  -- The pending-approval agenda we attach comments to (Fiter's work).
  insert into public.tasks
    (name, project_id, pic_id, due_date, status, needs_approval, approval_state, planned_for, description)
  values
    ('Audit menu gizi SD 03', p_audit, fiter, current_date + 3, 'awaiting_approval', true, 'pending',
     current_date, 'Periksa kesesuaian menu dengan standar gizi anak SD; lampirkan ringkasan kalori.')
  returning id into t_audit_sd03;

  -- The rest of the 12 agendas. PIC mostly Fiter, a few Admin.
  insert into public.tasks
    (name, project_id, pic_id, due_date, status, needs_approval, approval_state, planned_for, completed_at, description)
  values
    -- on_progress, planned for TODAY → populate Today's Agenda
    ('Catat distribusi pagi',          p_dist,  fiter, current_date + 1, 'on_progress', false, 'na', current_date, null, null),
    ('Laporan stok dapur',             p_dapur, fiter, null,             'on_progress', false, 'na', current_date, null, null),
    ('Cek kebersihan dapur',           p_dapur, fiter, null,             'on_progress', false, 'na', current_date, null, null),
    ('Konfirmasi pengiriman pemasok',  p_pasok, admin, current_date + 2, 'on_progress', false, 'na', current_date, null,
     'Hubungi pemasok beras & sayur, konfirmasi jadwal kirim besok pagi.'),

    -- awaiting_approval / pending (needs_approval = true) → Kickstart + approval flow
    ('Laporan distribusi mingguan Zona A', p_dist,  fiter, current_date + 2, 'awaiting_approval', true, 'pending', current_date, null, null),
    ('Verifikasi kualitas bahan pemasok',  p_pasok, admin, current_date + 1, 'awaiting_approval', true, 'pending', current_date, null, null),

    -- done, completed across the last ~14 days → populate dashboard charts
    ('Distribusi makan SD 01',         p_dist,  fiter, current_date - 1, 'done', false, 'na', current_date - 1,  now() - interval '1 day',   null),
    ('Rekap stok dapur pekan lalu',    p_dapur, fiter, current_date - 3, 'done', false, 'na', current_date - 4,  now() - interval '4 days',  null),
    ('Audit gizi SD 02',               p_audit, fiter, current_date - 6, 'done', false, 'na', current_date - 7,  now() - interval '7 days',
     'Audit selesai; menu sesuai standar, catatan kecil pada porsi buah.'),
    ('Negosiasi harga beras',          p_pasok, admin, current_date - 9, 'done', false, 'na', current_date - 10, now() - interval '10 days', null),
    ('Distribusi makan TK Ceria',      p_dist,  fiter, current_date - 12,'done', false, 'na', current_date - 13, now() - interval '13 days', null);

  -- A short comment thread on the pending audit, so the approval screen has context.
  insert into public.comments (task_id, author_id, body) values
    (t_audit_sd03, fiter, 'Menu sudah dicocokkan dengan standar gizi, mohon ditinjau.'),
    (t_audit_sd03, fiter, 'Ringkasan kalori per porsi sudah dilampirkan di deskripsi.');

  raise notice 'MBG demo seeded: 4 projects, 12 agendas (PIC Fiter % / Admin %).', fiter, admin;
end $$;
