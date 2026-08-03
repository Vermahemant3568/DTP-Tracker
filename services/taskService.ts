import { supabase } from "@/lib/supabase";
import type { Task } from "@/types/database";

interface TaskInput {
  task_type_id:        string;
  work_type:           "Inhouse" | "Vendor";
  assigned_to_id:      string;
  assigned_to_type:    "Employee" | "Vendor";
  task_language_ids:   string[];
  payment_status:      "Paid" | "Unpaid";
  rate_per_page:       number | null;
  source_pages:        number | null;
  number_of_languages: number | null;
  final_pages:         number | null;
  source_file_link:       string;
  deliverable_link:       string;
  task_notes:             string;
  task_received_date:     string | null;
  task_delivery_date:     string | null;
  status:                 "pending" | "in_progress" | "completed" | "on_hold" | "cancelled";
}

// ── Fetch all tasks for a project ─────────────────────────────

export async function fetchTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id, project_id, task_type_id, work_type,
      assigned_to_id, assigned_to_type,
      payment_status, rate_per_page,
      source_pages, number_of_languages, final_pages,
      source_file_link, deliverable_link, task_notes,
      task_received_date, task_delivery_date,
      status, created_at, updated_at,
      task_types ( id, name ),
      task_languages (
        id, task_id, language_id,
        languages ( id, language_name )
      ),
      task_revisions (
        id, task_id, work_type, assigned_to_id, assigned_to_type,
        revision_pages, rate_per_page, payment_status, revision_notes,
        created_at, updated_at
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const tasks = (data as unknown as Task[]) ?? [];

  // Batch-resolve assigned_name from employees or vendors
  const employeeIds = tasks
    .filter((t) => t.assigned_to_type === "Employee" && t.assigned_to_id)
    .map((t) => t.assigned_to_id as string);

  const vendorIds = tasks
    .filter((t) => t.assigned_to_type === "Vendor" && t.assigned_to_id)
    .map((t) => t.assigned_to_id as string);

  // Also collect revision assignee ids
  const revEmpIds = tasks.flatMap((t) =>
    (t.task_revisions ?? []).filter((r) => r.assigned_to_type === "Employee" && r.assigned_to_id).map((r) => r.assigned_to_id as string)
  );
  const revVndIds = tasks.flatMap((t) =>
    (t.task_revisions ?? []).filter((r) => r.assigned_to_type === "Vendor" && r.assigned_to_id).map((r) => r.assigned_to_id as string)
  );

  const allEmpIds = [...new Set([...employeeIds, ...revEmpIds])];
  const allVndIds = [...new Set([...vendorIds,   ...revVndIds])];

  const [empMap, vendorMap] = await Promise.all([
    allEmpIds.length > 0
      ? supabase.from("employees").select("id, full_name").in("id", allEmpIds)
          .then(({ data: d }) => Object.fromEntries((d ?? []).map((e) => [e.id, e.full_name])))
      : Promise.resolve({} as Record<string, string>),
    allVndIds.length > 0
      ? supabase.from("vendors").select("id, company_name").in("id", allVndIds)
          .then(({ data: d }) => Object.fromEntries((d ?? []).map((v) => [v.id, v.company_name])))
      : Promise.resolve({} as Record<string, string>),
  ]);

  return tasks.map((t) => ({
    ...t,
    assigned_name:
      t.assigned_to_type === "Employee"
        ? (empMap[t.assigned_to_id ?? ""] ?? "—")
        : (vendorMap[t.assigned_to_id ?? ""] ?? "—"),
    total_revision_pages: (t.task_revisions ?? []).reduce((sum, r) => sum + r.revision_pages, 0),
    task_revisions: (t.task_revisions ?? []).map((r) => ({
      ...r,
      assigned_name:
        r.assigned_to_type === "Employee"
          ? (empMap[r.assigned_to_id ?? ""] ?? "—")
          : (vendorMap[r.assigned_to_id ?? ""] ?? "—"),
    })),
  }));
}

// ── Insert ────────────────────────────────────────────────────

export async function insertTask(
  projectId: string,
  values: TaskInput
): Promise<void> {
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      project_id:          projectId,
      task_type_id:        values.task_type_id,
      work_type:           values.work_type,
      assigned_to_id:      values.assigned_to_id      || null,
      assigned_to_type:    values.assigned_to_type,
      payment_status:      values.payment_status,
      rate_per_page:       values.rate_per_page        ?? null,
      source_pages:        values.source_pages         ?? null,
      number_of_languages: values.number_of_languages  ?? null,
      final_pages:         values.final_pages          ?? null,
      source_file_link:    values.source_file_link     || null,
      deliverable_link:    values.deliverable_link     || null,
      task_notes:          values.task_notes           || null,
      task_received_date:  values.task_received_date   || null,
      task_delivery_date:  values.task_delivery_date   || null,
      status:              values.status,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);

  // Insert task_languages junction rows
  if (values.task_language_ids.length > 0) {
    const { error: langError } = await supabase
      .from("task_languages")
      .insert(
        values.task_language_ids.map((language_id) => ({
          task_id: task.id,
          language_id,
        }))
      );
    if (langError) throw new Error(`Task created but languages failed: ${langError.message}`);
  }
}

// ── Update ────────────────────────────────────────────────────

export async function updateTask(
  id: string,
  values: TaskInput
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      task_type_id:        values.task_type_id,
      work_type:           values.work_type,
      assigned_to_id:      values.assigned_to_id      || null,
      assigned_to_type:    values.assigned_to_type,
      payment_status:      values.payment_status,
      rate_per_page:       values.rate_per_page        ?? null,
      source_pages:        values.source_pages         ?? null,
      number_of_languages: values.number_of_languages  ?? null,
      final_pages:         values.final_pages          ?? null,
      source_file_link:    values.source_file_link     || null,
      deliverable_link:    values.deliverable_link     || null,
      task_notes:          values.task_notes           || null,
      task_received_date:  values.task_received_date   || null,
      task_delivery_date:  values.task_delivery_date   || null,
      status:              values.status,
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update task: ${error.message}`);

  // Replace task_languages: delete then re-insert
  const { error: delError } = await supabase
    .from("task_languages")
    .delete()
    .eq("task_id", id);
  if (delError) throw new Error(`Failed to update languages: ${delError.message}`);

  if (values.task_language_ids.length > 0) {
    const { error: langError } = await supabase
      .from("task_languages")
      .insert(
        values.task_language_ids.map((language_id) => ({
          task_id: id,
          language_id,
        }))
      );
    if (langError) throw new Error(`Failed to save languages: ${langError.message}`);
  }
}

// ── Delete ────────────────────────────────────────────────────
// task_languages rows cascade-delete automatically.

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}
