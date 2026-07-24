-- ================================================================
-- 04_trigger_updated_at.sql
-- Automatically sets updated_at = now() on every row update
-- for clients, employees, and projects.
-- ================================================================

create function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

create trigger trg_employees_updated_at
  before update on employees
  for each row execute function set_updated_at();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();
