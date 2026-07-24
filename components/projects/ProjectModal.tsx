"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Check, AlertTriangle, FolderKanban,
  User, Calendar, FileText, Globe, Hash, StickyNote, Search,
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchClients, fetchEmployees, fetchSourceLanguages, fetchTargetLanguages,
  insertProject, updateProject,
} from "@/services/projectService";
import { fetchTasks } from "@/services/taskService";
import type {
  Client, Employee, Language, Project, ProjectStatus,
} from "@/types/database";

// ── Status config ─────────────────────────────────────────────

const STATUS_OPTIONS: { value: ProjectStatus; label: string; cls: string; selected: string }[] = [
  { value: "pending",     label: "Pending",     cls: "border-amber-200 text-amber-600 hover:bg-amber-50",   selected: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "in_progress", label: "In Progress", cls: "border-blue-200 text-blue-600 hover:bg-blue-50",     selected: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "completed",   label: "Completed",   cls: "border-emerald-200 text-emerald-600 hover:bg-emerald-50", selected: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  { value: "on_hold",     label: "On Hold",     cls: "border-gray-200 text-gray-500 hover:bg-gray-50",     selected: "border-gray-400 bg-gray-100 text-gray-700" },
  { value: "cancelled",   label: "Cancelled",   cls: "border-red-200 text-red-500 hover:bg-red-50",        selected: "border-red-400 bg-red-50 text-red-600" },
];

// ── Schema ────────────────────────────────────────────────────

const schema = z.object({
  client_id:           z.string().min(1, "Client is required"),
  project_name:        z.string().min(1, "Project name is required").max(200),
  coordinator_id:      z.string(),
  received_date:       z.string().min(1, "Received date is required"),
  source_language_id:  z.string(),
  target_language_ids: z.array(z.string()).min(1, "Select at least one target language"),
  source_file_pages:   z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive("Must be a positive number").nullable()
  ),
  project_notes: z.string(),
  status:        z.string(),
});

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────

interface ProjectModalProps {
  open:      boolean;
  project?:  Project | null;
  onClose:   () => void;
  onSuccess: () => void;
}

const defaultValues: FormValues = {
  client_id: "", project_name: "", coordinator_id: "",
  received_date: new Date().toISOString().split("T")[0],
  source_language_id: "", target_language_ids: [],
  source_file_pages: null, project_notes: "", status: "pending",
};

// ── Component ─────────────────────────────────────────────────

export default function ProjectModal({ open, project, onClose, onSuccess }: ProjectModalProps) {
  const isEdit = !!project;

  const [clients,         setClients]         = useState<Client[]>([]);
  const [employees,       setEmployees]       = useState<Employee[]>([]);
  const [sourceLanguages, setSourceLanguages] = useState<Language[]>([]);
  const [targetLanguages, setTargetLanguages] = useState<Language[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [openTaskCount,   setOpenTaskCount]   = useState(0);
  const [totalTasks,      setTotalTasks]      = useState(0);

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const watchedStatus  = watch("status");
  const [langSearch,   setLangSearch]   = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const lookups = Promise.all([fetchClients(), fetchEmployees(), fetchSourceLanguages(), fetchTargetLanguages()])
      .then(([c, e, sl, tl]) => { setClients(c); setEmployees(e); setSourceLanguages(sl); setTargetLanguages(tl); });
    const taskCheck = project
      ? fetchTasks(project.id).then(tasks => {
          setTotalTasks(tasks.length);
          setOpenTaskCount(tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length);
        })
      : Promise.resolve();
    Promise.all([lookups, taskCheck])
      .catch(() => toast.error("Failed to load form data."))
      .finally(() => setLoading(false));
  }, [open, project]);

  useEffect(() => {
    if (project) {
      reset({
        client_id:           project.client_id,
        project_name:        project.project_name,
        coordinator_id:      project.coordinator_id     ?? "",
        received_date:       project.received_date,
        source_language_id:  project.source_language_id ?? "",
        target_language_ids: project.project_target_languages?.map(t => t.language_id) ?? [],
        source_file_pages:   project.source_file_pages  ?? null,
        project_notes:       project.project_notes      ?? "",
        status:              project.status,
      });
    } else {
      reset(defaultValues);
    }
  }, [project, reset]);

  const onSubmit = async (values: FormValues): Promise<void> => {
    if (values.status === "completed" && openTaskCount > 0) {
      toast.error(`Cannot mark as Completed — ${openTaskCount} task${openTaskCount > 1 ? "s are" : " is"} still open.`);
      return;
    }
    try {
      if (isEdit) {
        await updateProject(project!.id, values);
        toast.success(`Project "${values.project_name}" updated`);
      } else {
        const code = await insertProject(values);
        toast.success(`Project created — ${code}`);
        reset(defaultValues);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  const blockCompleted = watchedStatus === "completed" && openTaskCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <FolderKanban size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">
              {isEdit ? "Edit Project" : "New Project"}
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">
              {isEdit ? project?.project_code : "Fill in the details below to create a project"}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-7 w-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Loading form data…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-5">

              {/* ── Section: Basic Info ── */}
              <Section icon={<FileText size={14} />} title="Basic Information">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <Field label="Client" error={errors.client_id?.message} required>
                      <select {...register("client_id")} className={selectCls(!!errors.client_id)}>
                        <option value="">Select client…</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Project Name" error={errors.project_name?.message} required>
                      <input
                        {...register("project_name")}
                        placeholder="e.g. Annual Report 2025"
                        className={inputCls(!!errors.project_name)}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-1">
                    <Field label="Coordinator">
                      <select {...register("coordinator_id")} className={selectCls(false)}>
                        <option value="">Select coordinator…</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              </Section>

              {/* ── Section: Schedule & Pages ── */}
              <Section icon={<User size={14} />} title="Schedule & Pages">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Received Date" error={errors.received_date?.message} required>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input type="date" {...register("received_date")} className={`${inputCls(!!errors.received_date)} pl-8`} />
                    </div>
                  </Field>
                  <Field label="Source Language">
                    <select {...register("source_language_id")} className={selectCls(false)}>
                      <option value="">Select language…</option>
                      {sourceLanguages.map(l => <option key={l.id} value={l.id}>{l.language_name}</option>)}
                    </select>
                  </Field>
                  <Field label="Source File Pages" error={errors.source_file_pages?.message}>
                    <div className="relative">
                      <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input type="number" min={1} {...register("source_file_pages")} placeholder="e.g. 24" className={`${inputCls(!!errors.source_file_pages)} pl-8`} />
                    </div>
                  </Field>
                </div>
              </Section>

              {/* ── Section: Target Languages ── */}
              <Section icon={<Globe size={14} />} title="Target Languages">
                <Controller
                  control={control}
                  name="target_language_ids"
                  render={({ field }) => {
                    const filtered = langSearch.trim()
                      ? targetLanguages.filter(l => l.language_name.toLowerCase().includes(langSearch.toLowerCase()))
                      : targetLanguages;
                    const allSelected = targetLanguages.length > 0 && targetLanguages.every(l => field.value.includes(l.id));
                    const toggle = (id: string) =>
                      field.onChange(field.value.includes(id)
                        ? field.value.filter(v => v !== id)
                        : [...field.value, id]);

                    return (
                      <Field label="Target Languages" error={errors.target_language_ids?.message} required
                        hint={field.value.length > 0 ? `${field.value.length} selected` : undefined}>

                        {targetLanguages.length === 0 ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                            No target languages found. Add languages in the Languages settings.
                          </div>
                        ) : (
                          <div className={`rounded-xl border ${errors.target_language_ids ? "border-red-300" : "border-gray-200"}`}>

                            {/* Search + Select all bar */}
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
                              <Search size={13} className="text-gray-400 shrink-0" />
                              <input
                                type="text"
                                value={langSearch}
                                onChange={e => setLangSearch(e.target.value)}
                                placeholder="Search languages…"
                                className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
                              />
                              <button type="button"
                                onClick={() => field.onChange(allSelected ? [] : targetLanguages.map(l => l.id))}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0 transition-colors">
                                {allSelected ? "Clear all" : "Select all"}
                              </button>
                            </div>

                            {/* Grid */}
                            <div className="p-2.5 grid grid-cols-3 sm:grid-cols-5 gap-1.5 max-h-44 overflow-y-auto">
                              {filtered.length === 0 ? (
                                <p className="col-span-5 text-xs text-gray-400 py-2 text-center">No languages match your search.</p>
                              ) : (
                                filtered.map(lang => {
                                  const selected = field.value.includes(lang.id);
                                  return (
                                    <button
                                      key={lang.id}
                                      type="button"
                                      onClick={() => toggle(lang.id)}
                                      className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all border ${
                                        selected
                                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                                      }`}
                                    >
                                      {selected && <Check size={9} className="shrink-0" />}
                                      {lang.language_name}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {/* Selected tags */}
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.value.map(id => {
                              const lang = targetLanguages.find(l => l.id === id);
                              if (!lang) return null;
                              return (
                                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">
                                  {lang.language_name}
                                  <button type="button" onClick={() => toggle(id)} className="hover:text-blue-900"><X size={9} /></button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </Field>
                    );
                  }}
                />
              </Section>

              {/* ── Section: Status (edit only) ── */}
              {isEdit && (
                <Section icon={<Hash size={14} />} title="Project Status">
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map(opt => {
                      const isSelected = watchedStatus === opt.value;
                      const isBlocked  = opt.value === "completed" && openTaskCount > 0;
                      return (
                        <label
                          key={opt.value}
                          title={isBlocked ? `${openTaskCount} task${openTaskCount > 1 ? "s" : ""} still open` : undefined}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none ${
                            isBlocked
                              ? "opacity-35 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                              : isSelected
                              ? opt.selected
                              : `bg-white ${opt.cls}`
                          }`}
                        >
                          <input type="radio" {...register("status")} value={opt.value} disabled={isBlocked} className="sr-only" />
                          {isSelected && <Check size={11} className="shrink-0" />}
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>

                  {blockCompleted && (
                    <div className="flex items-start gap-2 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-xs text-amber-700">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span><strong>{openTaskCount}</strong> task{openTaskCount > 1 ? "s are" : " is"} still open. Complete or cancel all tasks first.</span>
                    </div>
                  )}

                  {totalTasks > 0 && openTaskCount === 0 && watchedStatus !== "completed" && (
                    <div className="flex items-start gap-2 mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3 text-xs text-emerald-700">
                      <Check size={14} className="shrink-0 mt-0.5" />
                      All tasks are done — you can now mark this project as Completed.
                    </div>
                  )}
                </Section>
              )}

              {/* ── Section: Notes ── */}
              <Section icon={<StickyNote size={14} />} title="Notes">
                <textarea
                  {...register("project_notes")}
                  rows={2}
                  placeholder="Any special instructions, notes, or context…"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none resize-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder-gray-400 ${
                    errors.project_notes ? "border-red-300" : "border-gray-200"
                  }`}
                />
              </Section>

            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80 shrink-0">
              <p className="text-xs text-gray-400">
                {isEdit ? "Changes will be saved immediately." : "Project code will be auto-generated."}
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                  {isSubmitting ? "Saving…" : isEdit ? "Update Project" : "Create Project"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-50 text-blue-600">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      {children}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────

function Field({ label, error, required, hint, children }: {
  label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-600">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-blue-600 font-medium">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}
    </div>
  );
}

const inputCls = (err: boolean) =>
  `h-9 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder-gray-400 ${
    err ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-white"
  }`;

const selectCls = (err: boolean) =>
  `h-9 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white ${
    err ? "border-red-300" : "border-gray-200"
  }`;
