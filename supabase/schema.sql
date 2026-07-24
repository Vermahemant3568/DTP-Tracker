-- ================================================================
-- DTP Tracker — Master Schema
-- Single file to run in Supabase SQL Editor to create everything.
-- Dashboard → SQL Editor → New Query → paste → Run
-- ================================================================


-- ================================================================
-- 1. DROP EXISTING (01_drop_existing.sql)
-- ================================================================
drop table if exists task_languages              cascade;
drop table if exists tasks                       cascade;
drop table if exists task_types                  cascade;
drop table if exists vendors                     cascade;
drop table if exists project_target_languages    cascade;
drop table if exists projects                    cascade;
drop table if exists languages                   cascade;
drop table if exists employees                   cascade;
drop table if exists clients                     cascade;

drop function if exists set_updated_at()           cascade;
drop function if exists generate_project_code()    cascade;
drop function if exists sync_number_of_languages() cascade;


-- ================================================================
-- 2. CREATE TABLES (02_create_tables.sql)
-- ================================================================

-- CLIENTS
create table clients (
  id             uuid        primary key default gen_random_uuid(),
  client_code    text        not null unique,
  company_name   text        not null,
  contact_person text,
  email          text,
  phone          text,
  address        text,
  country        text,
  status         text        not null default 'active'
                               check (status in ('active', 'inactive')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- EMPLOYEES
create table employees (
  id            uuid        primary key default gen_random_uuid(),
  employee_code text        not null unique,
  full_name     text        not null,
  email         text        unique,
  phone         text,
  designation   text,
  role          text        not null default 'dtp_team'
                              check (role in ('coordinator','dtp_team','custom')),
  status        text        not null default 'active'
                              check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- LANGUAGES
create table languages (
  id            uuid        primary key default gen_random_uuid(),
  language_name text        not null unique,
  language_code text        unique,
  language_type text        not null default 'both'
                              check (language_type in ('source', 'target', 'both')),
  status        text        not null default 'active'
                              check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now()
);

-- PROJECTS
create table projects (
  id                  uuid        primary key default gen_random_uuid(),
  project_code        text        not null unique,
  client_id           uuid        not null references clients(id)   on delete restrict,
  project_name        text        not null,
  coordinator_id      uuid                 references employees(id) on delete set null,
  received_date       date        not null default current_date,
  source_language_id  uuid                 references languages(id) on delete set null,
  source_file_pages   integer              check (source_file_pages > 0),
  number_of_languages integer     not null default 0,
  project_notes       text,
  status              text        not null default 'pending'
                                    check (status in (
                                      'pending','in_progress','completed',
                                      'on_hold','cancelled'
                                    )),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- PROJECT TARGET LANGUAGES (junction: projects ↔ languages)
create table project_target_languages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id)  on delete cascade,
  language_id uuid not null references languages(id) on delete restrict,
  unique (project_id, language_id)
);

-- VENDORS
create table vendors (
  id            uuid        primary key default gen_random_uuid(),
  vendor_code   text        not null unique,
  company_name  text        not null,
  contact_name  text,
  email         text        unique,
  phone         text,
  address       text,
  country       text,
  status        text        not null default 'active'
                              check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- TASK TYPES
create table task_types (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null unique,
  description text,
  status      text        not null default 'active'
                            check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now()
);

-- TASKS
create table tasks (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        not null references projects(id)   on delete cascade,
  task_type_id        uuid        not null references task_types(id) on delete restrict,
  work_type           text        not null
                                    check (work_type in ('Inhouse', 'Vendor')),
  assigned_to_id      uuid,
  assigned_to_type    text        not null
                                    check (assigned_to_type in ('Employee', 'Vendor')),
  payment_status      text        not null default 'Unpaid'
                                    check (payment_status in ('Paid', 'Unpaid')),
  rate_per_page       numeric(10,2),
  source_pages        integer              check (source_pages > 0),
  number_of_languages integer              check (number_of_languages > 0),
  final_pages         integer              check (final_pages > 0),
  source_file_link    text,
  deliverable_link    text,
  task_notes          text,
  status              text        not null default 'pending'
                                    check (status in (
                                      'pending','in_progress','completed',
                                      'on_hold','cancelled'
                                    )),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- TASK LANGUAGES (junction: tasks ↔ languages)
create table task_languages (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id)     on delete cascade,
  language_id uuid not null references languages(id) on delete restrict,
  unique (task_id, language_id)
);

-- TASK REVISIONS
create table task_revisions (
  id                 uuid        primary key default gen_random_uuid(),
  task_id            uuid        not null references tasks(id) on delete cascade,
  work_type          text        not null check (work_type in ('Inhouse', 'Vendor')),
  assigned_to_id     uuid,
  assigned_to_type   text        not null check (assigned_to_type in ('Employee', 'Vendor')),
  revision_pages     integer     not null check (revision_pages > 0),
  rate_per_page      numeric(10,2),
  payment_status     text        not null default 'Unpaid'
                                   check (payment_status in ('Paid', 'Unpaid')),
  revision_notes     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);


-- ================================================================
-- 3. INDEXES (03_indexes.sql)
-- ================================================================

-- projects
create index idx_projects_client_id      on projects(client_id);
create index idx_projects_coordinator_id on projects(coordinator_id);
create index idx_projects_status         on projects(status);
create index idx_projects_received_date  on projects(received_date desc);

-- project_target_languages
create index idx_ptl_project_id          on project_target_languages(project_id);
create index idx_ptl_language_id         on project_target_languages(language_id);

-- clients
create index idx_clients_status          on clients(status);

-- employees
create index idx_employees_role_status   on employees(role, status);

-- languages
create index idx_languages_status        on languages(status);
create index idx_languages_type          on languages(language_type);

-- vendors
create index idx_vendors_status          on vendors(status);

-- tasks
create index idx_tasks_project_id        on tasks(project_id);
create index idx_tasks_task_type_id      on tasks(task_type_id);
create index idx_tasks_assigned_to_id    on tasks(assigned_to_id);
create index idx_tasks_status            on tasks(status);
create index idx_tasks_work_type         on tasks(work_type);
create index idx_tasks_payment_status    on tasks(payment_status);

-- task_languages
create index idx_task_languages_task_id     on task_languages(task_id);
create index idx_task_languages_language_id on task_languages(language_id);

-- task_revisions
create index idx_task_revisions_task_id on task_revisions(task_id);


-- ================================================================
-- 4. TRIGGERS — updated_at (04_trigger_updated_at.sql)
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

create trigger trg_vendors_updated_at
  before update on vendors
  for each row execute function set_updated_at();

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create trigger trg_task_revisions_updated_at
  before update on task_revisions
  for each row execute function set_updated_at();


-- ================================================================
-- 5. TRIGGER — project_code (05_trigger_project_code.sql)
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


-- ================================================================
-- 6. TRIGGER — language count (06_trigger_language_count.sql)
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


-- ================================================================
-- 7. SEED DATA (07_seed_data.sql + 08_task_module.sql)
-- ================================================================

-- Languages
insert into languages (language_name, language_code, language_type) values
  ('Arabic',     'ar', 'both'),
  ('Bengali',    'bn', 'both'),
  ('Chinese',    'zh', 'both'),
  ('English',    'en', 'both'),
  ('French',     'fr', 'both'),
  ('German',     'de', 'both'),
  ('Gujarati',   'gu', 'both'),
  ('Hindi',      'hi', 'both'),
  ('Japanese',   'ja', 'both'),
  ('Kannada',    'kn', 'both'),
  ('Malayalam',  'ml', 'both'),
  ('Marathi',    'mr', 'both'),
  ('Odia',       'or', 'both'),
  ('Portuguese', 'pt', 'both'),
  ('Punjabi',    'pa', 'both'),
  ('Russian',    'ru', 'both'),
  ('Spanish',    'es', 'both'),
  ('Tamil',      'ta', 'both'),
  ('Telugu',     'te', 'both'),
  ('Urdu',       'ur', 'both')
on conflict (language_code) do nothing;

-- Clients
insert into clients (client_code, company_name, contact_person, email, country) values
  ('CLT-0001', 'Acme Corp',      'John Smith',  'john@acmecorp.com',   'India'),
  ('CLT-0002', 'Nova Prints',    'Sara Lee',    'sara@novaprints.com', 'India'),
  ('CLT-0003', 'Bright Media',   'Raj Patel',   'raj@brightmedia.com', 'India'),
  ('CLT-0004', 'Stellar Events', 'Meena Iyer',  'meena@stellar.com',   'India')
on conflict (client_code) do nothing;

-- Employees
insert into employees (employee_code, full_name, email, designation, role) values
  ('EMP-0001', 'Ravi Kumar',   'ravi@dtptracker.com',  'Senior Coordinator',  'coordinator'),
  ('EMP-0002', 'Priya Sharma', 'priya@dtptracker.com', 'Project Coordinator', 'coordinator'),
  ('EMP-0003', 'Amit Singh',   'amit@dtptracker.com',  'DTP Designer',        'dtp_team')
on conflict (employee_code) do nothing;

-- Task Types
insert into task_types (name, description) values
  ('DTP',          'Desktop Publishing — layout and formatting'),
  ('Translation',  'Language translation of source content'),
  ('Proofreading', 'Review and correction of translated content'),
  ('QA',           'Quality assurance check'),
  ('Typesetting',  'Typesetting and font handling'),
  ('Scanning',     'Document scanning and digitisation'),
  ('OCR',          'Optical character recognition'),
  ('Editing',      'Content editing and revision')
on conflict (name) do nothing;

-- Vendors
insert into vendors (vendor_code, company_name, contact_name, email, country) values
  ('VND-0001', 'LinguaWorks',    'Suresh Nair',  'suresh@linguaworks.com', 'India'),
  ('VND-0002', 'TransPro India', 'Kavya Reddy',  'kavya@transpro.in',      'India'),
  ('VND-0003', 'GlobalDTP',      'Arjun Mehta',  'arjun@globaldtp.com',    'India')
on conflict (vendor_code) do nothing;
