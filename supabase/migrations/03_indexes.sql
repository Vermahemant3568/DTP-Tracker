-- ================================================================
-- 03_indexes.sql
-- Performance indexes on all foreign key columns, status fields,
-- and commonly filtered/sorted columns.
-- ================================================================

-- projects
create index idx_projects_client_id       on projects(client_id);
create index idx_projects_coordinator_id  on projects(coordinator_id);
create index idx_projects_status          on projects(status);
create index idx_projects_received_date   on projects(received_date desc);

-- project_target_languages
create index idx_ptl_project_id           on project_target_languages(project_id);
create index idx_ptl_language_id          on project_target_languages(language_id);

-- clients
create index idx_clients_status           on clients(status);

-- employees
create index idx_employees_role_status    on employees(role, status);

-- languages
create index idx_languages_status         on languages(status);
