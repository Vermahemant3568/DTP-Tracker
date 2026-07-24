-- ================================================================
-- 05_trigger_project_code.sql
-- Auto-generates project_code before every INSERT on projects.
-- Format: PRJ-YYYYMM-XXXX  →  e.g. PRJ-202508-0001
-- The sequence resets each calendar month.
-- ================================================================

create function generate_project_code()
returns trigger language plpgsql as $$
declare
  v_prefix text;
  v_seq    int;
begin
  v_prefix := 'PRJ-' || to_char(now(), 'YYYYMM') || '-';

  select coalesce(
    max(cast(substring(project_code from length(v_prefix) + 1) as integer)),
    0
  ) + 1
  into v_seq
  from projects
  where project_code like v_prefix || '%'
    and project_code ~ ('^' || v_prefix || '[0-9]{4}$');

  new.project_code := v_prefix || lpad(v_seq::text, 4, '0');
  return new;
end;
$$;

create trigger trg_projects_code
  before insert on projects
  for each row execute function generate_project_code();
