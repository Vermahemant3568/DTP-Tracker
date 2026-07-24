-- ================================================================
-- 11_update_employee_roles.sql
-- Simplifies employee roles to: coordinator, dtp_team, custom
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- Step 1: Drop old constraint FIRST (before any data changes)
alter table employees drop constraint if exists employees_role_check;

-- Step 2: Migrate existing data
update employees set role = 'dtp_team' where role in ('designer', 'admin');
update employees set role = 'custom'   where role = 'vendor';

-- Step 3: Add new constraint
alter table employees
  add constraint employees_role_check
  check (role in ('coordinator', 'dtp_team', 'custom'));

-- Step 4: Update default
alter table employees alter column role set default 'dtp_team';
