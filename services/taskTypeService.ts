import { supabase } from "@/lib/supabase";
import type { TaskType, TaskTypeFormValues } from "@/types/database";

const SELECT = "id, name, description, status, created_at";

export async function fetchTaskTypes(): Promise<TaskType[]> {
  const { data, error } = await supabase
    .from("task_types")
    .select(SELECT)
    .eq("status", "active")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllTaskTypes(): Promise<TaskType[]> {
  const { data, error } = await supabase
    .from("task_types")
    .select(SELECT)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function insertTaskType(values: TaskTypeFormValues): Promise<void> {
  const { error } = await supabase.from("task_types").insert({
    name:        values.name,
    description: values.description || null,
    status:      values.status,
  });
  if (error) throw new Error(error.message);
}

export async function updateTaskType(id: string, values: TaskTypeFormValues): Promise<void> {
  const { error } = await supabase.from("task_types").update({
    name:        values.name,
    description: values.description || null,
    status:      values.status,
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTaskType(id: string): Promise<void> {
  const { error } = await supabase.from("task_types").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
