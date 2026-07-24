import { supabase } from "@/lib/supabase";
import type { Employee } from "@/types/database";

export async function fetchEmployees(): Promise<Employee[]> {
  // Only DTP team members are assignable to tasks (not coordinators or vendors)
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_code, full_name, email, phone, designation, role, status, created_at, updated_at")
    .eq("status", "active")
    .eq("role", "dtp_team")
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_code, full_name, email, phone, designation, role, status, created_at, updated_at")
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCoordinators(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_code, full_name, email, phone, designation, role, status, created_at, updated_at")
    .eq("status", "active")
    .eq("role", "coordinator")
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function insertEmployee(
  values: Omit<Employee, "id" | "employee_code" | "created_at" | "updated_at">
): Promise<string> {
  const { data: existing } = await supabase
    .from("employees")
    .select("employee_code")
    .order("employee_code", { ascending: false })
    .limit(1);

  const lastCode = existing?.[0]?.employee_code ?? "EMP-0000";
  const lastNum  = parseInt(lastCode.replace("EMP-", ""), 10) || 0;
  const newCode  = `EMP-${String(lastNum + 1).padStart(4, "0")}`;

  const { error } = await supabase.from("employees").insert({ ...values, employee_code: newCode });
  if (error) throw error;
  return newCode;
}

export async function updateEmployee(
  id: string,
  values: Partial<Omit<Employee, "id" | "employee_code" | "created_at" | "updated_at">>
): Promise<void> {
  const { error } = await supabase.from("employees").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}
