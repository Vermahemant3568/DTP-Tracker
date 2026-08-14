import { supabase } from "@/lib/supabase";
import type { Project } from "@/types/database";

interface ProjectInput {
  client_id:           string;
  project_name:        string;
  coordinator_id:      string;
  received_date:       string;
  source_language_id:  string;
  target_language_ids: string[];
  source_file_pages:   number | null;
  project_notes:       string;
  status:              string;
}

// Re-export lookup fetchers — modal only needs one import
export { fetchClients }                                                from "./clientService";
export { fetchCoordinators as fetchEmployees }                         from "./employeeService";
export { fetchSourceLanguages, fetchTargetLanguages }                  from "./languageService";

// ── Fetch project languages (source + targets) for task modal ─

export async function fetchProjectLanguages(projectId: string): Promise<{
  sourceLanguage: { id: string; language_name: string } | null;
  targetLanguages: { id: string; language_name: string }[];
}> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      source_language_id,
      languages ( id, language_name ),
      project_target_languages (
        language_id,
        languages ( id, language_name )
      )
    `)
    .eq("id", projectId)
    .single();

  if (error) throw new Error(error.message);

  const proj = data as any;
  return {
    sourceLanguage:  proj.languages ?? null,
    targetLanguages: (proj.project_target_languages ?? []).map((t: any) => t.languages).filter(Boolean),
  };
}

// ── Fetch all projects with joined relations ──────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,
      project_code,
      client_id,
      project_name,
      coordinator_id,
      received_date,
      source_language_id,
      source_file_pages,
      number_of_languages,
      project_notes,
      status,
      created_at,
      updated_at,
      clients      ( id, company_name ),
      employees    ( id, full_name ),
      languages    ( id, language_name ),
      project_target_languages (
        id,
        project_id,
        language_id,
        languages ( id, language_name )
      ),
      tasks ( final_pages )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data as unknown as (Project & { tasks?: { final_pages: number | null }[] })[]) ?? []).map(p => ({
    ...p,
    total_task_pages: (p.tasks ?? []).reduce((sum, t) => sum + (t.final_pages ?? 0), 0) || 0,
  }));
}

// ── Insert project + target languages ────────────────────────
//
// Flow:
//   1. Insert the project row.
//      - project_code is set by the DB trigger (BEFORE INSERT).
//        We pass a temporary placeholder so the NOT NULL constraint
//        is satisfied before the trigger overwrites it.
//   2. Insert all selected target languages into
//      project_target_languages using the returned project id.
//   3. The DB trigger on project_target_languages automatically
//      updates projects.number_of_languages — no manual update needed.

export async function insertProject(values: ProjectInput): Promise<string> {
  // Step 1 — insert project row
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      project_code:       "PENDING",           // overwritten by trigger
      project_name:       values.project_name,
      client_id:          values.client_id,
      coordinator_id:     values.coordinator_id     || null,
      source_language_id: values.source_language_id || null,
      received_date:      values.received_date,
      source_file_pages:  values.source_file_pages  || null,
      project_notes:      values.project_notes      || null,
    })
    .select("id, project_code")
    .single();

  if (projectError) {
    throw new Error(`Failed to create project: ${projectError.message}`);
  }

  // Step 2 — insert target languages
  if (values.target_language_ids.length > 0) {
    const { error: langError } = await supabase
      .from("project_target_languages")
      .insert(
        values.target_language_ids.map((language_id) => ({
          project_id: project.id,
          language_id,
        }))
      );

    if (langError) {
      // Project was created — surface a clear message so the user knows
      throw new Error(
        `Project "${project.project_code}" was created but target languages failed to save: ${langError.message}`
      );
    }
  }

  return project.project_code;
}

// ── Update project + replace target languages ─────────────────

export async function updateProject(
  id: string,
  values: ProjectInput
): Promise<void> {
  // Step 1 — update project row
  const { error: projectError } = await supabase
    .from("projects")
    .update({
      project_name:       values.project_name,
      client_id:          values.client_id,
      coordinator_id:     values.coordinator_id     || null,
      source_language_id: values.source_language_id || null,
      received_date:      values.received_date,
      source_file_pages:  values.source_file_pages  || null,
      project_notes:      values.project_notes      || null,
      status:             values.status,
    })
    .eq("id", id);

  if (projectError) throw new Error(`Failed to update project: ${projectError.message}`);

  // Step 2 — delete existing target languages
  const { error: deleteError } = await supabase
    .from("project_target_languages")
    .delete()
    .eq("project_id", id);

  if (deleteError) throw new Error(`Failed to update target languages: ${deleteError.message}`);

  // Step 3 — re-insert selected target languages
  if (values.target_language_ids.length > 0) {
    const { error: langError } = await supabase
      .from("project_target_languages")
      .insert(
        values.target_language_ids.map((language_id) => ({
          project_id: id,
          language_id,
        }))
      );

    if (langError) throw new Error(`Failed to save target languages: ${langError.message}`);
  }
}

// ── Update project status only ───────────────────────────────

export async function updateProjectStatus(
  id: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(`Failed to update project status: ${error.message}`);
}

// ── Fetch projects filtered by month + year ──────────────────

export async function fetchProjectsByMonth(year: number, month: number): Promise<Project[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to   = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,
      project_code,
      client_id,
      project_name,
      coordinator_id,
      received_date,
      source_language_id,
      source_file_pages,
      number_of_languages,
      project_notes,
      status,
      created_at,
      updated_at,
      clients      ( id, company_name ),
      employees    ( id, full_name ),
      languages    ( id, language_name ),
      project_target_languages (
        id,
        project_id,
        language_id,
        languages ( id, language_name )
      ),
      tasks ( final_pages )
    `)
    .gte("received_date", from)
    .lte("received_date", to)
    .order("received_date", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as unknown as (Project & { tasks?: { final_pages: number | null }[] })[]) ?? []).map(p => ({
    ...p,
    total_task_pages: (p.tasks ?? []).reduce((sum, t) => sum + (t.final_pages ?? 0), 0) || 0,
  }));
}

// ── Delete project ────────────────────────────────────────────
// project_target_languages rows cascade-delete automatically.

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete project: ${error.message}`);
}
