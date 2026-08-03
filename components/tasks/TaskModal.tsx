"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Check, Link2, Calendar, Calculator, UserCheck,
  ClipboardList, Globe, AlertTriangle, StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import SearchableSelect, { type SelectOption } from "@/components/ui/searchable-select";
import { fetchTaskTypes }           from "@/services/taskTypeService";
import { fetchEmployees }           from "@/services/employeeService";
import { fetchVendors }             from "@/services/vendorService";
import { fetchProjectLanguages }    from "@/services/projectService";
import { insertTask, updateTask }   from "@/services/taskService";
import type { Task, TaskType, Employee, Vendor } from "@/types/database";

// ── Schema ────────────────────────────────────────────────────

const baseSchema = z.object({
  task_type_id:        z.string().min(1, "Task type is required"),
  work_type:           z.enum(["Inhouse", "Vendor"]),
  assigned_to_id:      z.string().min(1, "Assignee is required"),
  assigned_to_type:    z.enum(["Employee", "Vendor"]),
  task_language_ids:   z.array(z.string()).min(1, "Select at least one language"),
  payment_status:      z.enum(["Paid", "Unpaid"]),
  rate_per_page:       z.string().or(z.number()).nullable()
    .transform(v => (v === "" || v === null) ? null : Number(v))
    .pipe(z.number().nonnegative("Must be ≥ 0").nullable()),
  source_pages:        z.string().or(z.number()).nullable()
    .transform(v => (v === "" || v === null) ? null : Number(v))
    .pipe(z.number().int().positive("Source pages must be positive")),
  number_of_languages: z.string().or(z.number()).nullable()
    .transform(v => (v === "" || v === null) ? null : Number(v))
    .pipe(z.number().int().positive("Number of languages must be positive")),
  final_pages:         z.string().or(z.number()).nullable()
    .transform(v => (v === "" || v === null) ? null : Number(v))
    .pipe(z.number().int().positive("Final pages must be positive")),
  source_file_link:   z.string(),
  deliverable_link:   z.string(),
  task_notes:         z.string(),
  task_received_date: z.string().nullable(),
  task_delivery_date: z.string().nullable(),
  status:             z.enum(["pending", "in_progress", "completed", "on_hold", "cancelled"]),
});

type FormValues = z.input<typeof baseSchema>;

const schema = baseSchema
  .refine(
    (d) => d.payment_status === "Unpaid" || (d.rate_per_page !== null && d.rate_per_page > 0),
    { message: "Rate per page is required when Paid", path: ["rate_per_page"] }
  )
  .refine(
    (d) =>
      !d.task_received_date ||
      !d.task_delivery_date ||
      d.task_delivery_date >= d.task_received_date,
    { message: "Delivery Date cannot be before Received Date", path: ["task_delivery_date"] }
  );

// ── Status config ─────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "pending",     label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "on_hold",     label: "On Hold" },
  { value: "cancelled",   label: "Cancelled" },
];

// ── Props / Defaults ──────────────────────────────────────────

interface TaskModalProps {
  open:      boolean;
  projectId: string;
  task?:     Task | null;
  onClose:   () => void;
  onSuccess: () => void;
}

interface ProjectLang {
  id:            string;
  language_name: string;
  isSource:      boolean;
}

const defaultValues: FormValues = {
  task_type_id: "", work_type: "Inhouse", assigned_to_id: "",
  assigned_to_type: "Employee", task_language_ids: [],
  payment_status: "Unpaid", rate_per_page: null,
  source_pages: null, number_of_languages: null, final_pages: null,
  source_file_link: "", deliverable_link: "", task_notes: "",
  task_received_date: null, task_delivery_date: null, status: "pending",
};

// ── Component ─────────────────────────────────────────────────

export default function TaskModal({ open, projectId, task, onClose, onSuccess }: TaskModalProps) {
  const isEdit = !!task;

  const [taskTypes,     setTaskTypes]     = useState<TaskType[]>([]);
  const [employees,     setEmployees]     = useState<Employee[]>([]);
  const [vendors,       setVendors]       = useState<Vendor[]>([]);
  const [projectLangs,  setProjectLangs]  = useState<ProjectLang[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [finalOverride, setFinalOverride] = useState(false);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const workType       = watch("work_type");
  const sourcePagesVal = watch("source_pages");
  const taskLangIds    = watch("task_language_ids");
  const paymentStatus  = watch("payment_status");
  const watchedStatus  = watch("status");

  // Auto-set number_of_languages from selected languages count
  useEffect(() => {
    const count = taskLangIds.length;
    setValue("number_of_languages", count > 0 ? count : null);
    if (!finalOverride) {
      const sp = Number(sourcePagesVal);
      if (sp > 0 && count > 0) setValue("final_pages", sp * count);
      else if (count === 0) setValue("final_pages", null);
    }
  }, [taskLangIds, setValue]);

  // Auto-calc final pages when source pages changes
  useEffect(() => {
    if (finalOverride) return;
    const sp = Number(sourcePagesVal);
    const nl = taskLangIds.length;
    if (sp > 0 && nl > 0) setValue("final_pages", sp * nl);
    else if (sp === 0 || !sourcePagesVal) setValue("final_pages", null);
  }, [sourcePagesVal, finalOverride, setValue]);

  // Sync assigned_to_type when work type changes
  useEffect(() => {
    setValue("assigned_to_type", workType === "Inhouse" ? "Employee" : "Vendor");
    setValue("assigned_to_id", "");
  }, [workType, setValue]);

  // Clear rate when Unpaid
  useEffect(() => {
    if (paymentStatus === "Unpaid") setValue("rate_per_page", null);
  }, [paymentStatus, setValue]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([fetchTaskTypes(), fetchEmployees(), fetchVendors(), fetchProjectLanguages(projectId)])
      .then(([tt, emp, vnd, projLangs]) => {
        setTaskTypes(tt);
        setEmployees(emp);
        setVendors(vnd);

        // Build unified language list: source first, then targets
        const langs: ProjectLang[] = [];
        if (projLangs.sourceLanguage) {
          langs.push({ ...projLangs.sourceLanguage, isSource: true });
        }
        projLangs.targetLanguages.forEach(l => {
          // avoid duplicate if source == target
          if (!langs.find(x => x.id === l.id)) {
            langs.push({ ...l, isSource: false });
          }
        });
        setProjectLangs(langs);
      })
      .catch(() => toast.error("Failed to load form data"))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  useEffect(() => {
    if (task) {
      setFinalOverride(true);
      reset({
        task_type_id:        task.task_type_id,
        work_type:           task.work_type,
        assigned_to_id:      task.assigned_to_id      ?? "",
        assigned_to_type:    task.assigned_to_type,
        task_language_ids:   task.task_languages?.map(tl => tl.language_id) ?? [],
        payment_status:      task.payment_status,
        rate_per_page:       task.rate_per_page        ?? null,
        source_pages:        task.source_pages         ?? null,
        number_of_languages: task.number_of_languages  ?? null,
        final_pages:         task.final_pages          ?? null,
        source_file_link:    task.source_file_link     ?? "",
        deliverable_link:    task.deliverable_link     ?? "",
        task_notes:          task.task_notes           ?? "",
        task_received_date:  task.task_received_date   ?? null,
        task_delivery_date:  task.task_delivery_date   ?? null,
        status:              task.status,
      });
    } else {
      setFinalOverride(false);
      reset(defaultValues);
    }
  }, [task, reset]);

  const onSubmit = async (values: FormValues): Promise<void> => {
    const toNum = (v: string | number | null): number | null =>
      v === "" || v === null ? null : Number(v);
    const payload = {
      ...values,
      rate_per_page:       toNum(values.rate_per_page),
      source_pages:        toNum(values.source_pages),
      number_of_languages: toNum(values.number_of_languages),
      final_pages:         toNum(values.final_pages),
      task_received_date:  values.task_received_date || null,
      task_delivery_date:  values.task_delivery_date || null,
    };
    try {
      if (isEdit) {
        await updateTask(task!.id, payload);
        toast.success("Task updated");
      } else {
        await insertTask(projectId, payload);
        toast.success("Task created");
        reset(defaultValues);
        setFinalOverride(false);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  const taskTypeOpts: SelectOption[] = taskTypes.map(t => ({ value: t.id, label: t.name }));
  const assigneeOpts: SelectOption[] = workType === "Inhouse"
    ? employees.map(e => ({ value: e.id, label: e.full_name + (e.designation ? ` — ${e.designation}` : "") }))
    : vendors.map(v => ({ value: v.id, label: v.company_name + (v.contact_name ? ` (${v.contact_name})` : "") }));

  const allLangIds  = projectLangs.map(l => l.id);
  const allSelected = allLangIds.length > 0 && allLangIds.every(id => taskLangIds.includes(id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-t-2xl shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <ClipboardList size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">{isEdit ? "Edit Task" : "New Task"}</h2>
            <p className="text-xs text-indigo-200 mt-0.5">
              {isEdit ? `Editing: ${task?.task_types?.name ?? "task"}` : "Fill in the details to create a new task"}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-7 w-7 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Loading form data…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-5">

              {/* ── Section 1: Assignment ── */}
              <Section icon={<UserCheck size={14} />} title="Assignment">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Field label="Task Type" error={errors.task_type_id?.message} required>
                      <Controller control={control} name="task_type_id"
                        render={({ field }) => (
                          <SearchableSelect options={taskTypeOpts} value={field.value} onChange={field.onChange}
                            placeholder="Select task type…" error={!!errors.task_type_id} />
                        )}
                      />
                    </Field>
                  </div>
                  <Field label="Work Type" required>
                    <div className="flex gap-2 h-9">
                      {(["Inhouse", "Vendor"] as const).map(wt => (
                        <Controller key={wt} control={control} name="work_type"
                          render={({ field }) => (
                            <button type="button" onClick={() => field.onChange(wt)}
                              className={`flex-1 rounded-xl border text-xs font-semibold transition-all ${
                                field.value === wt
                                  ? wt === "Inhouse"
                                    ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                                    : "bg-orange-500 border-orange-500 text-white shadow-sm"
                                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                              }`}>
                              {wt === "Inhouse" ? "🏢 Inhouse" : "🤝 Vendor"}
                            </button>
                          )}
                        />
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <Field label={workType === "Inhouse" ? "Assigned Employee" : "Assigned Vendor"} error={errors.assigned_to_id?.message} required>
                      <Controller key={workType} control={control} name="assigned_to_id"
                        render={({ field }) => (
                          <SearchableSelect options={assigneeOpts} value={field.value} onChange={field.onChange}
                            placeholder={workType === "Inhouse" ? "Search employee…" : "Search vendor…"}
                            error={!!errors.assigned_to_id} />
                        )}
                      />
                      {assigneeOpts.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">No {workType === "Inhouse" ? "employees" : "vendors"} found.</p>
                      )}
                    </Field>
                  </div>
                  <Field label="Payment Status" required>
                    <div className="flex gap-2 h-9">
                      {(["Unpaid", "Paid"] as const).map(ps => (
                        <Controller key={ps} control={control} name="payment_status"
                          render={({ field }) => (
                            <button type="button" onClick={() => field.onChange(ps)}
                              className={`flex-1 rounded-xl border text-xs font-semibold transition-all ${
                                field.value === ps
                                  ? ps === "Unpaid"
                                    ? "bg-red-500 border-red-500 text-white shadow-sm"
                                    : "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                              }`}>
                              {ps === "Unpaid" ? "⏳ Unpaid" : "✅ Paid"}
                            </button>
                          )}
                        />
                      ))}
                    </div>
                  </Field>
                  <Field label="Rate Per Page (₹)" error={errors.rate_per_page?.message} required={paymentStatus === "Paid"}>
                    <input type="number" min={0} step="0.01" {...register("rate_per_page")}
                      disabled={paymentStatus === "Unpaid"}
                      placeholder={paymentStatus === "Unpaid" ? "N/A" : "e.g. 12.50"}
                      className={`${inputCls(!!errors.rate_per_page)} ${paymentStatus === "Unpaid" ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
                    />
                  </Field>
                </div>
              </Section>

              {/* ── Section 2: Languages ── */}
              <Section icon={<Globe size={14} />} title="Task Languages">
                <Controller control={control} name="task_language_ids"
                  render={({ field }) => (
                    <div className="space-y-2">

                      {/* Legend + select all */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                            Source
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                            Target
                          </span>
                        </div>
                        {projectLangs.length > 0 && (
                          <button type="button"
                            onClick={() => field.onChange(allSelected ? [] : allLangIds)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                            {allSelected ? "Clear all" : "Select all"}
                          </button>
                        )}
                      </div>

                      {/* Language grid */}
                      {projectLangs.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 flex items-center gap-2">
                          <AlertTriangle size={13} />
                          No languages configured for this project. Please add source/target languages to the project first.
                        </div>
                      ) : (
                        <div className={`rounded-xl border p-2.5 grid grid-cols-3 sm:grid-cols-5 gap-1.5 ${
                          errors.task_language_ids ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-gray-50/50"
                        }`}>
                          {projectLangs.map(lang => {
                            const selected = field.value.includes(lang.id);
                            return (
                              <button key={lang.id} type="button"
                                onClick={() => field.onChange(
                                  selected
                                    ? field.value.filter(id => id !== lang.id)
                                    : [...field.value, lang.id]
                                )}
                                className={`relative flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                                  selected
                                    ? lang.isSource
                                      ? "bg-sky-500 text-white shadow-sm"
                                      : "bg-indigo-600 text-white shadow-sm"
                                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                                }`}>
                                {selected && <Check size={9} className="shrink-0" />}
                                {lang.language_name}
                                {/* Source/target dot indicator when not selected */}
                                {!selected && (
                                  <span className={`absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full ${
                                    lang.isSource ? "bg-sky-400" : "bg-indigo-400"
                                  }`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected chips */}
                      {taskLangIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {taskLangIds.map(id => {
                            const lang = projectLangs.find(l => l.id === id);
                            if (!lang) return null;
                            return (
                              <span key={id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                                lang.isSource
                                  ? "bg-sky-50 border-sky-200 text-sky-700"
                                  : "bg-indigo-50 border-indigo-200 text-indigo-700"
                              }`}>
                                {lang.isSource && <span className="text-[9px] font-bold uppercase tracking-wide opacity-60">src</span>}
                                {lang.language_name}
                                <button type="button" onClick={() => field.onChange(field.value.filter(v => v !== id))}
                                  className="hover:opacity-70"><X size={9} /></button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {errors.task_language_ids && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle size={11} />{errors.task_language_ids.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </Section>

              {/* ── Section 3: Page Counts ── */}
              <Section icon={<Calculator size={14} />} title="Page Counts">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Source Pages" error={errors.source_pages?.message} required>
                    <input type="number" min={1} {...register("source_pages")} placeholder="e.g. 10" className={inputCls(!!errors.source_pages)} />
                  </Field>
                  <Field label={finalOverride ? "Final Pages (manual)" : "Final Pages (auto)"} error={errors.final_pages?.message} required>
                    <div className="relative">
                      <input type="number" min={1} {...register("final_pages")} placeholder="Auto"
                        onFocus={() => setFinalOverride(true)}
                        className={inputCls(!!errors.final_pages)} />
                      {finalOverride && (
                        <button type="button"
                          onClick={() => {
                            setFinalOverride(false);
                            const sp = Number(sourcePagesVal), nl = taskLangIds.length;
                            if (sp > 0 && nl > 0) setValue("final_pages", sp * nl);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                          Auto
                        </button>
                      )}
                    </div>
                    {!finalOverride && Number(sourcePagesVal) > 0 && taskLangIds.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Number(sourcePagesVal)} × {taskLangIds.length} lang = {Number(sourcePagesVal) * taskLangIds.length} pages
                      </p>
                    )}
                  </Field>
                  <Field label="Status" required>
                    <select {...register("status")}
                      className={`h-9 w-full rounded-xl border px-3 text-xs font-semibold outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white ${
                        watchedStatus === "pending"     ? "border-amber-300 text-amber-700 bg-amber-50" :
                        watchedStatus === "in_progress" ? "border-blue-300 text-blue-700 bg-blue-50" :
                        watchedStatus === "completed"   ? "border-emerald-300 text-emerald-700 bg-emerald-50" :
                        watchedStatus === "on_hold"     ? "border-gray-300 text-gray-600 bg-gray-50" :
                        watchedStatus === "cancelled"   ? "border-red-300 text-red-600 bg-red-50" :
                        "border-gray-200 text-gray-700"
                      }`}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* ── Section 4: Dates ── */}
              <Section icon={<Calendar size={14} />} title="Dates">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Task Received Date">
                    <input type="date" {...register("task_received_date")}
                      className={inputCls(false)} />
                  </Field>
                  <Field label="Delivery Date" error={(errors as Record<string, { message?: string }>).task_delivery_date?.message}>
                    <input type="date" {...register("task_delivery_date")}
                      className={inputCls(!!(errors as Record<string, { message?: string }>).task_delivery_date)} />
                  </Field>
                </div>
              </Section>

              {/* ── Section 5: Links & Notes ── */}
              <Section icon={<Link2 size={14} />} title="Links & Notes">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Source File Link">
                    <input {...register("source_file_link")} placeholder="https://drive.google.com/…" className={inputCls(false)} />
                  </Field>
                  <Field label="Deliverable Link">
                    <input {...register("deliverable_link")} placeholder="https://drive.google.com/…" className={inputCls(false)} />
                  </Field>
                </div>
                <Field label="Task Notes">
                  <textarea {...register("task_notes")} rows={2}
                    placeholder="Any special instructions or notes…"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none resize-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-gray-400"
                  />
                </Field>
              </Section>

            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80 shrink-0">
              <p className="text-xs text-gray-400">
                {isEdit ? "Changes will be saved immediately." : "Final pages auto-calculated from source × languages."}
              </p>
              <div className="flex gap-2.5">
                <button type="button" onClick={onClose}
                  className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                  {isSubmitting && <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                  {isSubmitting ? "Saving…" : isEdit ? "Update Task" : "Create Task"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center h-6 w-6 rounded-md bg-indigo-50 text-indigo-600">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}
    </div>
  );
}

const inputCls = (err: boolean) =>
  `h-9 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 ${
    err ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-white"
  }`;
