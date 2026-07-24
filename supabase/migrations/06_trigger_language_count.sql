-- ================================================================
-- 06_trigger_language_count.sql
-- Keeps projects.number_of_languages in sync automatically.
-- Fires after every INSERT or DELETE on project_target_languages.
-- No manual update needed from the application layer.
-- ================================================================

create function sync_number_of_languages()
returns trigger language plpgsql as $$
declare
  v_pid uuid;
begin
  v_pid := coalesce(new.project_id, old.project_id);

  update projects
     set number_of_languages = (
           select count(*)
             from project_target_languages
            where project_id = v_pid
         )
   where id = v_pid;

  return null;
end;
$$;

create trigger trg_ptl_sync_count
  after insert or delete on project_target_languages
  for each row execute function sync_number_of_languages();
