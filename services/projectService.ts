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
export { fetchCoordinators as fetchEmployees, fetchEmployees as fetchDtpTeam } from "./employeeService";
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

// ── Fetch project names for a client (duplicate check) ──────

export async function fetchProjectNamesByClient(
  clientId: string
): Promise<{ id: string; project_name: string; project_code: string }[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, project_name, project_code")
    .eq("client_id", clientId)
    .order("project_name");
  if (error) throw new Error(error.message);
  return data ?? [];
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
      tasks (
        final_pages,
        task_revisions ( revision_pages )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  type RawFetchTask = { final_pages: number | null; task_revisions?: { revision_pages: number }[] };
  return ((data as unknown as (Project & { tasks?: RawFetchTask[] })[]) ?? []).map(p => ({
    ...p,
    total_task_pages:     (p.tasks ?? []).reduce((sum, t) => sum + (t.final_pages ?? 0), 0) || 0,
    total_revision_pages: (p.tasks ?? []).reduce((sum, t) => sum + (t.task_revisions ?? []).reduce((rs, r) => rs + (r.revision_pages ?? 0), 0), 0) || 0,
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
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth  = month === 12 ? 1 : month + 1;
  const endYear   = month === 12 ? year + 1 : year;
  const endDate   = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

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
      tasks (
        id,
        work_type,
        assigned_to_type,
        assigned_to_id,
        final_pages,
        source_pages,
        task_received_date,
        task_delivery_date,
        status,
        created_at,
        task_types ( id, name ),
        task_languages ( language_id, languages ( language_name ) ),
        task_revisions ( id, revision_pages, work_type, assigned_to_id, assigned_to_type, created_at )
      )
    `)
    .order("received_date", { ascending: true });

  if (error) throw new Error(error.message);

  // Collect all unique assigned_to_ids to resolve names in one query
  type RawTask = {
    id: string; work_type: string; assigned_to_type: string;
    assigned_to_id: string | null; final_pages: number | null;
    source_pages: number | null; task_received_date: string | null;
    task_delivery_date: string | null; status: string; created_at: string;
    task_types: { id: string; name: string } | { id: string; name: string }[] | null;
    task_revisions?: { id: string; revision_pages: number; work_type: string; assigned_to_id: string | null; assigned_to_type: string; created_at: string }[];
  };
  type RawProject = Project & { tasks?: RawTask[] };
  const projects = (data as unknown as RawProject[]) ?? [];

  const employeeIds = new Set<string>();
  const vendorIds   = new Set<string>();
  projects.forEach(p =>
    (p.tasks ?? []).forEach(t => {
      if (!t.assigned_to_id) return;
      if (t.assigned_to_type === "Employee") employeeIds.add(t.assigned_to_id);
      else vendorIds.add(t.assigned_to_id);
    })
  );

  const [empRes, venRes] = await Promise.all([
    employeeIds.size > 0
      ? supabase.from("employees").select("id, full_name").in("id", [...employeeIds])
      : Promise.resolve({ data: [] as { id: string; full_name: string }[], error: null }),
    vendorIds.size > 0
      ? supabase.from("vendors").select("id, company_name").in("id", [...vendorIds])
      : Promise.resolve({ data: [] as { id: string; company_name: string }[], error: null }),
  ]);

  const empMap = new Map((empRes.data ?? []).map(e => [e.id, e.full_name]));
  const venMap = new Map((venRes.data ?? []).map(v => [v.id, v.company_name]));

  const result = projects.map(p => ({
    ...p,
    total_task_pages: (p.tasks ?? []).reduce((sum, t) => sum + (t.final_pages ?? 0), 0) || 0,
    tasks: (p.tasks ?? []).map(t => ({
      ...t,
      task_types: Array.isArray(t.task_types) ? t.task_types[0] ?? null : t.task_types,
      assigned_name: t.assigned_to_id
        ? (t.assigned_to_type === "Employee" ? empMap.get(t.assigned_to_id) : venMap.get(t.assigned_to_id)) ?? "—"
        : "—",
    })),
  }));

  // Only return projects that have at least one task in the selected month
  return result.filter(p =>
    (p.tasks ?? []).some(t => {
      const dateStr: string = (t.task_received_date as string | null) ?? (t.created_at as string)?.slice(0, 10) ?? "";
      return dateStr.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}`;
    })
  );
}

// ── Delete project ────────────────────────────────────────────
// project_target_languages rows cascade-delete automatically.

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete project: ${error.message}`);
}
