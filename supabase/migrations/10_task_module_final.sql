-- ================================================================
-- TASK MODULE — Full Migration (Idempotent)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to run whether or not 08_task_module.sql was run before.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. VENDORS
-- ----------------------------------------------------------------
create table if not exists vendors (
  id           uuid        primary key default gen_random_uuid(),
  vendor_code  text        not null unique,
  company_name text        not null,
  contact_name text,
  email        text        unique,
  phone        text,
  address      text,
  country      text,
  status       text        not null default 'active'
                             check (status in ('active', 'inactive')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_vendors_status on vendors(status);

create or replace trigger trg_vendors_updated_at
  before update on vendors
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------
-- 2. TASK TYPES
-- ----------------------------------------------------------------
create table if not exists task_types (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null unique,
  description text,
  status      text        not null default 'active'
                            check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 3. TASKS
-- task_language_id is intentionally excluded — languages are
-- stored in task_languages junction table below.
-- Future modules (jobs, qa, billing, files, reports) FK → tasks.id
-- ----------------------------------------------------------------
create table if not exists tasks (
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

-- Drop the old single-language column if it was added by a previous run
alter table tasks drop column if exists task_language_id;

-- Indexes
create index if not exists idx_tasks_project_id      on tasks(project_id);
create index if not exists idx_tasks_task_type_id    on tasks(task_type_id);
create index if not exists idx_tasks_assigned_to_id  on tasks(assigned_to_id);
create index if not exists idx_tasks_status          on tasks(status);
create index if not exists idx_tasks_work_type       on tasks(work_type);
create index if not exists idx_tasks_payment_status  on tasks(payment_status);

create or replace trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------
-- 4. TASK LANGUAGES  (junction: tasks ↔ languages)
-- ----------------------------------------------------------------
create table if not exists task_languages (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id)     on delete cascade,
  language_id uuid not null references languages(id) on delete restrict,
  unique (task_id, language_id)
);

create index if not exists idx_task_languages_task_id     on task_languages(task_id);
create index if not exists idx_task_languages_language_id on task_languages(language_id);

-- ----------------------------------------------------------------
-- 5. SEED: TASK TYPES
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 6. SEED: VENDORS
-- ----------------------------------------------------------------
insert into vendors (vendor_code, company_name, contact_name, email, country) values
  ('VND-0001', 'LinguaWorks',    'Suresh Nair',  'suresh@linguaworks.com', 'India'),
  ('VND-0002', 'TransPro India', 'Kavya Reddy',  'kavya@transpro.in',      'India'),
  ('VND-0003', 'GlobalDTP',      'Arjun Mehta',  'arjun@globaldtp.com',    'India')
on conflict (vendor_code) do nothing;
