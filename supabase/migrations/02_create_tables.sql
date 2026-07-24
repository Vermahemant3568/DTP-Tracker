-- ================================================================
-- 02_create_tables.sql
-- Creates all 5 tables with primary keys, foreign keys,
-- check constraints, and default values.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. CLIENTS
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 2. EMPLOYEES
-- ----------------------------------------------------------------
create table employees (
  id            uuid        primary key default gen_random_uuid(),
  employee_code text        not null unique,
  full_name     text        not null,
  email         text        unique,
  phone         text,
  designation   text,
  role          text        not null default 'coordinator'
                              check (role in ('coordinator','designer','vendor','admin')),
  status        text        not null default 'active'
                              check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 3. LANGUAGES
-- ----------------------------------------------------------------
create table languages (
  id            uuid        primary key default gen_random_uuid(),
  language_name text        not null unique,
  language_code text        unique,
  status        text        not null default 'active'
                              check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 4. PROJECTS
-- Future modules (tasks, jobs, billing, files, reports, vendors)
-- can all FK → projects.id without altering this table.
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 5. PROJECT TARGET LANGUAGES  (junction: projects ↔ languages)
-- ----------------------------------------------------------------
create table project_target_languages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id)  on delete cascade,
  language_id uuid not null references languages(id) on delete restrict,
  unique (project_id, language_id)
);
