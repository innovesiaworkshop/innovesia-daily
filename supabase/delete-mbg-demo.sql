-- ---------------------------------------------------------------------------
-- YAYASAN MBG — DEMO CLEANUP
-- Paste into the MBG Supabase Dashboard → SQL Editor to wipe the demo data.
--
-- Deleting the "DEMO — " projects cascades to their agendas (tasks.project_id →
-- projects ON DELETE CASCADE) and then to those agendas' comments
-- (comments.task_id → tasks ON DELETE CASCADE), so this one statement removes
-- every project / agenda / comment the seed created.
--
-- NOTE: this intentionally does NOT revert roles — Fiter and Admin stay 'employer'.
-- To demote them later:
--   update public.profiles set role = 'employee'
--   where id in ('09a34321-18ed-41b9-bce1-40a29a14b932',
--                'af1e98fc-4bb9-48c5-ba35-702457a47c5b');
-- ---------------------------------------------------------------------------

delete from public.projects where name like 'DEMO — %';
