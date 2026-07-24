import { supabase } from "@/lib/supabase";
import type { TaskRevision, TaskRevisionFormValues } from "@/types/database";

const SELECT = "id, task_id, revision_type, work_type, assigned_to_id, assigned_to_type, revision_pages, rate_per_page, payment_status, revision_notes, created_at, updated_at";

async function resolveNames(revisions: TaskRevision[]): Promise<TaskRevision[]> {
  const empIds = revisions.filter((r) => r.assigned_to_type === "Employee" && r.assigned_to_id).map((r) => r.assigned_to_id as string);
  const vndIds = revisions.filter((r) => r.assigned_to_type === "Vendor"   && r.assigned_to_id).map((r) => r.assigned_to_id as string);

  const [empMap, vndMap] = await Promise.all([
    empIds.length > 0
      ? supabase.from("employees").select("id, full_name").in("id", empIds)
          .then(({ data: d }) => Object.fromEntries((d ?? []).map((e) => [e.id, e.full_name])))
      : Promise.resolve({} as Record<string, string>),
    vndIds.length > 0
      ? supabase.from("vendors").select("id, company_name").in("id", vndIds)
          .then(({ data: d }) => Object.fromEntries((d ?? []).map((v) => [v.id, v.company_name])))
      : Promise.resolve({} as Record<string, string>),
  ]);

  return revisions.map((r) => ({
    ...r,
    assigned_name:
      r.assigned_to_type === "Employee"
        ? (empMap[r.assigned_to_id ?? ""] ?? "—")
        : (vndMap[r.assigned_to_id ?? ""] ?? "—"),
  }));
}

export async function fetchRevisions(taskId: string): Promise<TaskRevision[]> {
  const { data, error } = await supabase
    .from("task_revisions")
    .select(SELECT)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return resolveNames((data as TaskRevision[]) ?? []);
}

export async function insertRevision(taskId: string, values: TaskRevisionFormValues): Promise<void> {
  const { error } = await supabase.from("task_revisions").insert({
    task_id:          taskId,
    revision_type:    values.revision_type,
    work_type:        values.work_type,
    assigned_to_id:   values.assigned_to_id   || null,
    assigned_to_type: values.assigned_to_type,
    revision_pages:   values.revision_pages,
    rate_per_page:    values.rate_per_page     ?? null,
    payment_status:   values.payment_status,
    revision_notes:   values.revision_notes   || null,
  });
  if (error) throw new Error(error.message);
}

export async function updateRevision(id: string, values: TaskRevisionFormValues): Promise<void> {
  const { error } = await supabase.from("task_revisions").update({
    revision_type:    values.revision_type,
    work_type:        values.work_type,
    assigned_to_id:   values.assigned_to_id   || null,
    assigned_to_type: values.assigned_to_type,
    revision_pages:   values.revision_pages,
    rate_per_page:    values.rate_per_page     ?? null,
    payment_status:   values.payment_status,
    revision_notes:   values.revision_notes   || null,
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRevision(id: string): Promise<void> {
  const { error } = await supabase.from("task_revisions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
