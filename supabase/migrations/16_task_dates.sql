-- ================================================================
-- Migration: Add task_received_date & task_delivery_date
-- Safe to run on a live database with existing data.
-- Idempotent: safe to run multiple times without side effects.
-- ================================================================

-- Step 1: Add columns only if they don't already exist.
-- NULL default means every existing row gets NULL — no data change.
alter table tasks
  add column if not exists task_received_date date default null,
  add column if not exists task_delivery_date date default null;

-- Step 2: Drop the check constraint if it exists from a previous run,
-- then re-add it cleanly.
alter table tasks drop constraint if exists chk_task_dates;

alter table tasks
  add constraint chk_task_dates check (
    task_received_date is null
    or task_delivery_date is null
    or task_delivery_date >= task_received_date
  );

-- Step 3: Add indexes for common filter/sort queries on these date columns.
create index if not exists idx_tasks_received_date on tasks (task_received_date);
create index if not exists idx_tasks_delivery_date on tasks (task_delivery_date);
