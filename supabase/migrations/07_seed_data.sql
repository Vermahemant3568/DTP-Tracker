-- ================================================================
-- 07_seed_data.sql
-- Initial seed data: 20 languages, 4 clients, 3 employees.
-- Safe to re-run — uses ON CONFLICT DO NOTHING.
-- ================================================================

-- ----------------------------------------------------------------
-- Languages
-- ----------------------------------------------------------------
insert into languages (language_name, language_code) values
  ('Arabic',     'ar'),
  ('Bengali',    'bn'),
  ('Chinese',    'zh'),
  ('English',    'en'),
  ('French',     'fr'),
  ('German',     'de'),
  ('Gujarati',   'gu'),
  ('Hindi',      'hi'),
  ('Japanese',   'ja'),
  ('Kannada',    'kn'),
  ('Malayalam',  'ml'),
  ('Marathi',    'mr'),
  ('Odia',       'or'),
  ('Portuguese', 'pt'),
  ('Punjabi',    'pa'),
  ('Russian',    'ru'),
  ('Spanish',    'es'),
  ('Tamil',      'ta'),
  ('Telugu',     'te'),
  ('Urdu',       'ur')
on conflict (language_code) do nothing;

-- ----------------------------------------------------------------
-- Clients
-- ----------------------------------------------------------------
insert into clients (client_code, company_name, contact_person, email, country) values
  ('CLT-0001', 'Acme Corp',      'John Smith',  'john@acmecorp.com',   'India'),
  ('CLT-0002', 'Nova Prints',    'Sara Lee',    'sara@novaprints.com', 'India'),
  ('CLT-0003', 'Bright Media',   'Raj Patel',   'raj@brightmedia.com', 'India'),
  ('CLT-0004', 'Stellar Events', 'Meena Iyer',  'meena@stellar.com',   'India')
on conflict (client_code) do nothing;

-- ----------------------------------------------------------------
-- Employees
-- ----------------------------------------------------------------
insert into employees (employee_code, full_name, email, designation, role) values
  ('EMP-0001', 'Ravi Kumar',   'ravi@dtptracker.com',  'Senior Coordinator',  'coordinator'),
  ('EMP-0002', 'Priya Sharma', 'priya@dtptracker.com', 'Project Coordinator', 'coordinator'),
  ('EMP-0003', 'Amit Singh',   'amit@dtptracker.com',  'DTP Designer',        'designer')
on conflict (employee_code) do nothing;
