// ================================================================
// DTP Tracker – Database Types
// Mirrors the Supabase schema exactly.
// ================================================================

// ── Lookup tables ─────────────────────────────────────────────

export interface Client {
  id:             string;
  client_code:    string;
  company_name:   string;
  contact_person: string | null;
  email:          string | null;
  phone:          string | null;
  address:        string | null;
  country:        string | null;
  status:         "active" | "inactive";
  created_at:     string;
  updated_at:     string;
}

export interface Employee {
  id:             string;
  employee_code:  string;
  full_name:      string;
  email:          string | null;
  phone:          string | null;
  designation:    string | null;
  role:           "coordinator" | "dtp_team" | "custom";
  status:         "active" | "inactive";
  created_at:     string;
  updated_at:     string;
}

export interface Vendor {
  id:           string;
  vendor_code:  string;
  company_name: string;
  contact_name: string | null;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
  country:      string | null;
  status:       "active" | "inactive";
  created_at:   string;
  updated_at:   string;
}

export interface Language {
  id:            string;
  language_name: string;
  language_code: string | null;
  language_type: "source" | "target" | "both";
  status:        "active" | "inactive";
  created_at:    string;
}

// LanguageFormValues is inferred from the Zod schema in LanguageModal

export interface TaskType {
  id:          string;
  name:        string;
  description: string | null;
  status:      "active" | "inactive";
  created_at:  string;
}

// TaskTypeFormValues is inferred from the Zod schema in TaskTypeModal

// ── Projects ──────────────────────────────────────────────────

export type ProjectStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";

export interface Project {
  id:                  string;
  project_code:        string;
  client_id:           string;
  project_name:        string;
  coordinator_id:      string | null;
  received_date:       string;
  source_language_id:  string | null;
  source_file_pages:   number | null;
  number_of_languages: number;
  project_notes:       string | null;
  status:              ProjectStatus;
  created_at:          string;
  updated_at:          string;
  total_task_pages?:     number;
  total_revision_pages?: number;
  // Joined
  clients?:                  Pick<Client,   "id" | "company_name">   | null;
  employees?:                Pick<Employee, "id" | "full_name">       | null;
  languages?:                Pick<Language, "id" | "language_name">   | null;
  project_target_languages?: ProjectTargetLanguage[];
}

export interface ProjectTargetLanguage {
  id:          string;
  project_id:  string;
  language_id: string;
  languages?:  Pick<Language, "id" | "language_name"> | null;
}

// ProjectFormValues is inferred from the Zod schema in ProjectModal

// ── Tasks ─────────────────────────────────────────────────────

export type TaskStatus      = "pending" | "in_progress" | "completed" | "on_hold" | "cancelled";
export type WorkType        = "Inhouse" | "Vendor";
export type AssignedToType  = "Employee" | "Vendor";
export type PaymentStatus   = "Paid" | "Unpaid";

export interface TaskLanguage {
  id:          string;
  task_id:     string;
  language_id: string;
  languages?:  Pick<Language, "id" | "language_name"> | null;
}

export interface Task {
  id:                  string;
  project_id:          string;
  task_type_id:        string;
  work_type:           WorkType;
  assigned_to_id:      string | null;
  assigned_to_type:    AssignedToType;
  payment_status:      PaymentStatus;
  rate_per_page:       number | null;
  source_pages:        number | null;
  number_of_languages: number | null;
  final_pages:         number | null;
  source_file_link:      string | null;
  deliverable_link:      string | null;
  task_notes:            string | null;
  task_received_date:    string | null;
  task_delivery_date:    string | null;
  status:                TaskStatus;
  created_at:            string;
  updated_at:            string;
  // Joined
  task_types?:      Pick<TaskType, "id" | "name">          | null;
  task_languages?:  TaskLanguage[];
  task_revisions?:  TaskRevision[];
  // virtual — populated after fetch
  assigned_name?:   string;
  total_revision_pages?: number;
}

// ── Task Revisions ───────────────────────────────────────────

export type RevisionType = "General" | "Client" | "QA" | "Proofreading" | "Internal";

export interface TaskRevision {
  id:               string;
  task_id:          string;
  revision_type:    RevisionType;
  work_type:        WorkType;
  assigned_to_id:   string | null;
  assigned_to_type: AssignedToType;
  revision_pages:   number;
  rate_per_page:    number | null;
  payment_status:   PaymentStatus;
  revision_notes:   string | null;
  created_at:       string;
  updated_at:       string;
  // virtual
  assigned_name?:   string;
}

// TaskRevisionFormValues is inferred from the Zod schema in RevisionModal

// ── Jobs ───────────────────────────────────────────────────

export type JobStatus = "pending" | "completed";

export interface Job {
  id:         string;
  task_id:    string;
  job_code:   string | null;
  status:     JobStatus;
  notes:      string | null;
  created_at: string;
  updated_at: string;
  // Joined
  tasks?: {
    id:                string;
    work_type:         WorkType;
    assigned_to_id:    string | null;
    assigned_to_type:  AssignedToType;
    rate_per_page:     number | null;
    final_pages:       number | null;
    source_file_link:  string | null;
    deliverable_link:  string | null;
    task_notes:        string | null;
    task_types?:       Pick<TaskType, "id" | "name"> | null;
    task_languages?:   TaskLanguage[];
    projects?: {
      id:              string;
      project_code:    string;
      project_name:    string;
      coordinator_id:  string | null;
      clients?:        Pick<Client, "id" | "company_name"> | null;
    } | null;
  } | null;
  // virtual
  assigned_name?:    string;
  coordinator_name?: string;
}

// JobFormValues is inferred from the Zod schema in JobCodeModal

// TaskFormValues is inferred from the Zod schema in TaskModal
