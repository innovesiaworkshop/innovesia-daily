-- task_files can now hold a URL link, not just an uploaded file.
-- kind distinguishes the two; url holds the link (file rows keep file_path).
-- file_path becomes nullable because link rows have no storage object.

alter table public.task_files
  add column kind text not null default 'file' check (kind in ('file', 'link')),
  add column url  text;

alter table public.task_files alter column file_path drop not null;

-- Integrity: a file row must have a storage path; a link row must have a url.
alter table public.task_files
  add constraint task_files_kind_payload_check
  check ((kind = 'file' and file_path is not null) or (kind = 'link' and url is not null));

-- Reload PostgREST's schema cache so the new columns are queryable immediately.
notify pgrst, 'reload schema';
