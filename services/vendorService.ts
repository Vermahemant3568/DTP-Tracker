import { supabase } from "@/lib/supabase";
import type { Vendor } from "@/types/database";

export async function fetchVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id, vendor_code, company_name, contact_name, email, phone, address, country, status, created_at, updated_at")
    .eq("status", "active")
    .order("company_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id, vendor_code, company_name, contact_name, email, phone, address, country, status, created_at, updated_at")
    .order("company_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function insertVendor(
  values: Omit<Vendor, "id" | "vendor_code" | "created_at" | "updated_at">
): Promise<string> {
  const { data: existing } = await supabase
    .from("vendors")
    .select("vendor_code")
    .order("vendor_code", { ascending: false })
    .limit(1);

  const lastCode = existing?.[0]?.vendor_code ?? "VND-0000";
  const lastNum  = parseInt(lastCode.replace("VND-", ""), 10) || 0;
  const newCode  = `VND-${String(lastNum + 1).padStart(4, "0")}`;

  const { error } = await supabase.from("vendors").insert({ ...values, vendor_code: newCode });
  if (error) throw new Error(error.message);
  return newCode;
}

export async function updateVendor(
  id: string,
  values: Partial<Omit<Vendor, "id" | "vendor_code" | "created_at" | "updated_at">>
): Promise<void> {
  const { error } = await supabase.from("vendors").update(values).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
