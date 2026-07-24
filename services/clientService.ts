import { supabase } from "@/lib/supabase";
import type { Client } from "@/types/database";

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, client_code, company_name, contact_person, email, phone, address, country, status, created_at, updated_at")
    .eq("status", "active")
    .order("company_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, client_code, company_name, contact_person, email, phone, address, country, status, created_at, updated_at")
    .order("company_name");
  if (error) throw error;
  return data ?? [];
}

export async function insertClient(
  values: Omit<Client, "id" | "client_code" | "created_at" | "updated_at">
): Promise<string> {
  // Generate client_code: CLT-XXXX
  const { data: existing } = await supabase
    .from("clients")
    .select("client_code")
    .order("client_code", { ascending: false })
    .limit(1);

  const lastCode = existing?.[0]?.client_code ?? "CLT-0000";
  const lastNum  = parseInt(lastCode.replace("CLT-", ""), 10) || 0;
  const newCode  = `CLT-${String(lastNum + 1).padStart(4, "0")}`;

  const { error } = await supabase.from("clients").insert({
    ...values,
    client_code: newCode,
  });
  if (error) throw error;
  return newCode;
}

export async function updateClient(
  id: string,
  values: Partial<Omit<Client, "id" | "client_code" | "created_at" | "updated_at">>
): Promise<void> {
  const { error } = await supabase.from("clients").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
