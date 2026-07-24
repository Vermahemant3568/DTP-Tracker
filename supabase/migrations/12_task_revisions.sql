-- ================================================================
-- 12_task_revisions.sql
-- Adds revision tracking per task.
-- Each revision records which pages were revised, who did it,
-- at what rate, and payment status.
-- ================================================================

create table if not exists task_revisions (
  id                 uuid        primary key default gen_random_uuid(),
  task_id            uuid        not null references tasks(id) on delete cascade,

  -- Who did the revision
  work_type          text        not null check (work_type in ('Inhouse', 'Vendor')),
  assigned_to_id     uuid,
  assigned_to_type   text        not null check (assigned_to_type in ('Employee', 'Vendor')),

  -- Page counts
  revision_pages     integer     not null check (revision_pages > 0),

  -- Financials
  rate_per_page      numeric(10,2),
  payment_status     text        not null default 'Unpaid'
                                   check (payment_status in ('Paid', 'Unpaid')),

  -- Notes
  revision_notes     text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_task_revisions_task_id on task_revisions(task_id);

create or replace trigger trg_task_revisions_updated_at
  before update on task_revisions
  for each row execute function set_updated_at();
