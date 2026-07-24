-- ================================================================
-- 09_task_languages.sql
-- Replaces the single task_language_id FK on tasks with a proper
-- many-to-many junction table: task_languages.
-- Run AFTER 08_task_module.sql.
-- ================================================================

-- Remove the old single-language column if it exists
alter table tasks drop column if exists task_language_id;

-- Junction table: tasks ↔ languages (many-to-many)
create table if not exists task_languages (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id)     on delete cascade,
  language_id uuid not null references languages(id) on delete restrict,
  unique (task_id, language_id)
);

create index if not exists idx_task_languages_task_id     on task_languages(task_id);
create index if not exists idx_task_languages_language_id on task_languages(language_id);
