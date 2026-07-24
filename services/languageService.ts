import { supabase } from "@/lib/supabase";
import type { Language } from "@/types/database";

interface LanguageInput {
  language_name: string;
  language_code: string;
  language_type: "source" | "target" | "both";
  status:        "active" | "inactive";
}

const SELECT = "id, language_name, language_code, language_type, status, created_at";

export async function fetchLanguages(): Promise<Language[]> {
  const { data, error } = await supabase
    .from("languages")
    .select(SELECT)
    .eq("status", "active")
    .order("language_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllLanguages(): Promise<Language[]> {
  const { data, error } = await supabase
    .from("languages")
    .select(SELECT)
    .order("language_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSourceLanguages(): Promise<Language[]> {
  const { data, error } = await supabase
    .from("languages")
    .select(SELECT)
    .eq("status", "active")
    .in("language_type", ["source", "both"])
    .order("language_name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTargetLanguages(): Promise<Language[]> {
  const { data, error } = await supabase
    .from("languages")
    .select(SELECT)
    .eq("status", "active")
    .in("language_type", ["target", "both"])
    .order("language_name");
  if (error) throw error;
  return data ?? [];
}

export async function insertLanguage(values: LanguageInput): Promise<void> {
  const { error } = await supabase.from("languages").insert({
    language_name: values.language_name,
    language_code: values.language_code || null,
    language_type: values.language_type,
    status:        values.status,
  });
  if (error) throw error;
}

export async function updateLanguage(id: string, values: LanguageInput): Promise<void> {
  const { error } = await supabase.from("languages").update({
    language_name: values.language_name,
    language_code: values.language_code || null,
    language_type: values.language_type,
    status:        values.status,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteLanguage(id: string): Promise<void> {
  const { error } = await supabase.from("languages").delete().eq("id", id);
  if (error) throw error;
}
