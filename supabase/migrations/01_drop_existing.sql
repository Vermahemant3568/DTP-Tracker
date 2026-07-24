-- ================================================================
-- 01_drop_existing.sql
-- Drops all existing tables, triggers, and functions in the
-- correct dependency order before recreating them.
-- ================================================================

drop table if exists project_target_languages cascade;
drop table if exists projects                  cascade;
drop table if exists languages                 cascade;
drop table if exists employees                 cascade;
drop table if exists clients                   cascade;

drop function if exists set_updated_at()           cascade;
drop function if exists generate_project_code()    cascade;
drop function if exists sync_number_of_languages() cascade;
