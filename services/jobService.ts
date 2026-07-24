import { supabase } from "@/lib/supabase";
import type { Job, JobFormValues } from "@/types/database";

export async function fetchJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      id, task_id, job_code, status, notes, created_at, updated_at,
      tasks (
        id, work_type, assigned_to_id, assigned_to_type,
        rate_per_page, final_pages, source_file_link, deliverable_link, task_notes,
        task_types ( id, name ),
        task_languages (
          id, task_id, language_id,
          languages ( id, language_name )
        ),
        projects (
          id, project_code, project_name, coordinator_id,
          clients ( id, company_name )
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const jobs = (data as unknown as Job[]) ?? [];

  // Collect IDs to resolve
  const empIds = jobs
    .filter((j) => j.tasks?.assigned_to_type === "Employee" && j.tasks?.assigned_to_id)
    .map((j) => j.tasks!.assigned_to_id as string);
  const vndIds = jobs
    .filter((j) => j.tasks?.assigned_to_type === "Vendor" && j.tasks?.assigned_to_id)
    .map((j) => j.tasks!.assigned_to_id as string);
  const coordIds = jobs
    .filter((j) => j.tasks?.projects?.coordinator_id)
    .map((j) => j.tasks!.projects!.coordinator_id as string);

  const uniqueEmpIds   = [...new Set([...empIds, ...coordIds])];

  const [empMap, vndMap] = await Promise.all([
    uniqueEmpIds.length > 0
      ? supabase.from("employees").select("id, full_name").in("id", uniqueEmpIds)
          .then(({ data: d }) => Object.fromEntries((d ?? []).map((e) => [e.id, e.full_name])))
      : Promise.resolve({} as Record<string, string>),
    vndIds.length > 0
      ? supabase.from("vendors").select("id, company_name").in("id", vndIds)
          .then(({ data: d }) => Object.fromEntries((d ?? []).map((v) => [v.id, v.company_name])))
      : Promise.resolve({} as Record<string, string>),
  ]);

  return jobs.map((j) => ({
    ...j,
    assigned_name:
      j.tasks?.assigned_to_type === "Employee"
        ? (empMap[j.tasks?.assigned_to_id ?? ""] ?? "—")
        : (vndMap[j.tasks?.assigned_to_id ?? ""] ?? "—"),
    coordinator_name: j.tasks?.projects?.coordinator_id
      ? (empMap[j.tasks.projects.coordinator_id] ?? "—")
      : "—",
  }));
}

// Enter job code + mark completed
export async function completeJob(id: string, values: JobFormValues): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update({
      job_code: values.job_code || null,
      notes:    values.notes    || null,
      status:   "completed",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Reopen a completed job (coordinator can revert)
export async function reopenJob(id: string): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update({ status: "pending", job_code: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
