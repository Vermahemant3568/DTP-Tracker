-- ================================================================
-- 13_jobs.sql
-- Jobs module: one job per paid task.
-- A DB trigger auto-creates a job row the moment a task's
-- payment_status is set to 'Paid'. Duplicate-safe via ON CONFLICT.
-- ================================================================

-- ── Jobs table ────────────────────────────────────────────────
create table if not exists jobs (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null unique references tasks(id) on delete cascade,
  job_code    text,                          -- filled later by coordinator
  status      text        not null default 'pending'
                            check (status in ('pending', 'completed')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_jobs_task_id on jobs(task_id);
create index if not exists idx_jobs_status  on jobs(status);

create or replace trigger trg_jobs_updated_at
  before update on jobs
  for each row execute function set_updated_at();

-- ── Auto-create job when task becomes Paid ────────────────────
create or replace function auto_create_job()
returns trigger language plpgsql as $$
begin
  -- Only fire when payment_status transitions TO 'Paid'
  if new.payment_status = 'Paid' and
     (old.payment_status is distinct from 'Paid') then
    insert into jobs (task_id)
    values (new.id)
    on conflict (task_id) do nothing;   -- idempotent: never duplicate
  end if;
  return new;
end;
$$;

create or replace trigger trg_task_paid_create_job
  after update on tasks
  for each row execute function auto_create_job();

-- Also handle INSERT where task is created already Paid
create or replace function auto_create_job_on_insert()
returns trigger language plpgsql as $$
begin
  if new.payment_status = 'Paid' then
    insert into jobs (task_id)
    values (new.id)
    on conflict (task_id) do nothing;
  end if;
  return new;
end;
$$;

create or replace trigger trg_task_insert_create_job
  after insert on tasks
  for each row execute function auto_create_job_on_insert();

-- Back-fill: create jobs for any tasks already marked Paid
insert into jobs (task_id)
select id from tasks where payment_status = 'Paid'
on conflict (task_id) do nothing;
