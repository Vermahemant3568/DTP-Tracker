-- ================================================================
-- 14. Add language_type to languages
-- Run in Supabase SQL Editor
-- ================================================================

alter table languages
  add column if not exists language_type text not null default 'both'
    check (language_type in ('source', 'target', 'both'));

-- Back-fill existing rows
update languages set language_type = 'both' where language_type is null;

-- Update index
create index if not exists idx_languages_type on languages(language_type);
