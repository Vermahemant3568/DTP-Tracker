"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertTriangle, UserCheck, Calculator, StickyNote, RefreshCw, Check, Globe } from "lucide-react";
import { toast } from "sonner";

import SearchableSelect, { type SelectOption } from "@/components/ui/searchable-select";
import { fetchEmployees } from "@/services/employeeService";
import { fetchVendors }   from "@/services/vendorService";
import { insertRevision, updateRevision } from "@/services/revisionService";
import type { TaskRevision, TaskLanguage, Employee, Vendor, RevisionType } from "@/types/database";

// ── Revision type config ──────────────────────────────────────

const REVISION_TYPES: { value: RevisionType; label: string; color: string; active: string }[] = [
  { value: "General",      label: "General",      color: "text-gray-600",   active: "bg-gray-700 border-gray-700 text-white shadow-sm" },
  { value: "Client",       label: "Client",       color: "text-blue-600",   active: "bg-blue-600 border-blue-600 text-white shadow-sm" },
  { value: "QA",           label: "QA",           color: "text-indigo-600", active: "bg-indigo-600 border-indigo-600 text-white shadow-sm" },
  { value: "Proofreading", label: "Proofreading", color: "text-teal-600",   active: "bg-teal-600 border-teal-600 text-white shadow-sm" },
  { value: "Internal",     label: "Internal",     color: "text-violet-600", active: "bg-violet-600 border-violet-600 text-white shadow-sm" },
];

// ── Schema ────────────────────────────────────────────────────

const schema = z.object({
  revision_type:    z.enum(["General", "Client", "QA", "Proofreading", "Internal"]),
  work_type:        z.enum(["Inhouse", "Vendor"]),
  assigned_to_id:   z.string().min(1, "Assignee is required"),
  assigned_to_type: z.enum(["Employee", "Vendor"]),
  language_ids:     z.array(z.string()),
  revision_pages:   z.string().or(z.number()).nullable()
    .transform(v => (v === "" || v === null) ? null : Number(v))
    .pipe(z.number({ invalid_type_error: "Revision pages is required" }).int().positive("Must be a positive whole number")),
  rate_per_page:    z.string().or(z.number()).nullable()
    .transform(v => (v === "" || v === null) ? null : Number(v))
    .pipe(z.nullable(z.number().nonnegative("Must be ≥ 0"))),
  payment_status:   z.enum(["Paid", "Unpaid"]),
  revision_notes:   z.string(),
}).refine(
  d => d.payment_status === "Unpaid" || (d.rate_per_page !== null && d.rate_per_page > 0),
  { message: "Rate per page is required when Paid", path: ["rate_per_page"] }
);

type FormValues = z.input<typeof schema>;

const defaultValues: FormValues = {
  revision_type:    "General",
  work_type:        "Inhouse",
  assigned_to_id:   "",
  assigned_to_type: "Employee",
  language_ids:     [],
  revision_pages:   null,
  rate_per_page:    null,
  payment_status:   "Unpaid",
  revision_notes:   "",
};

// ── Props ─────────────────────────────────────────────────────

interface RevisionModalProps {
  open:          boolean;
  taskId:        string;
  revisionNo:    number;
  taskLanguages: TaskLanguage[];
  revision?:     TaskRevision | null;
  onClose:       () => void;
  onSuccess:     () => void;
}

// ── Component ─────────────────────────────────────────────────

export default function RevisionModal({
  open, taskId, revisionNo, taskLanguages, revision, onClose, onSuccess,
}: RevisionModalProps) {
  const isEdit = !!revision;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vendors,   setVendors]   = useState<Vendor[]>([]);
  const [loading,   setLoading]   = useState(false);

  const {
    register, handleSubmit, control, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const workType      = watch("work_type");
  const paymentStatus = watch("payment_status");
  const langIds       = watch("language_ids");

  const prevWorkType = useRef<string | null>(null);

  // Clear assignee only when user actively switches work type
  useEffect(() => {
    if (prevWorkType.current === null) { prevWorkType.current = workType; return; }
    if (prevWorkType.current === workType) return;
    prevWorkType.current = workType;
    setValue("assigned_to_type", workType === "Inhouse" ? "Employee" : "Vendor");
    setValue("assigned_to_id", "");
  }, [workType, setValue]);

  // Clear rate when switching to Unpaid
  useEffect(() => {
    if (paymentStatus === "Unpaid") setValue("rate_per_page", null);
  }, [paymentStatus, setValue]);

  // Load employees & vendors when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([fetchEmployees(), fetchVendors()])
      .then(([emp, vnd]) => { setEmployees(emp); setVendors(vnd); })
      .catch(() => toast.error("Failed to load form data"))
      .finally(() => setLoading(false));
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (revision) {
      prevWorkType.current = revision.work_type;
      reset({
        revision_type:    revision.revision_type,
        work_type:        revision.work_type,
        assigned_to_id:   revision.assigned_to_id   ?? "",
        assigned_to_type: revision.assigned_to_type,
        language_ids:     (revision as any).language_ids ?? [],
        revision_pages:   revision.revision_pages,
        rate_per_page:    revision.rate_per_page     ?? null,
        payment_status:   revision.payment_status,
        revision_notes:   revision.revision_notes   ?? "",
      });
    } else {
      prevWorkType.current = null;
      reset(defaultValues);
    }
  }, [revision, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await updateRevision(revision!.id, values);
        toast.success("Revision updated");
      } else {
        await insertRevision(taskId, values);
        toast.success(`Revision #${revisionNo} added`);
        reset(defaultValues);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  const assigneeOpts: SelectOption[] =
    workType === "Inhouse"
      ? employees.map(e => ({ value: e.id, label: e.full_name + (e.designation ? ` — ${e.designation}` : "") }))
      : vendors.map(v   => ({ value: v.id, label: v.company_name + (v.contact_name ? ` (${v.contact_name})` : "") }));

  const allLangIds  = taskLanguages.map(l => l.language_id);
  const allSelected = allLangIds.length > 0 && allLangIds.every(id => langIds.includes(id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-2xl shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <RefreshCw size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">
              {isEdit ? `Edit Revision #${revisionNo}` : `Add Revision #${revisionNo}`}
            </h2>
            <p className="text-xs text-violet-200 mt-0.5">
              {isEdit ? "Update the revision details below" : "Track revised pages separately from the original task"}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-7 w-7 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Loading form data…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-5">

              {/* ── Section 1: Revision Type ── */}
              <Section icon={<RefreshCw size={14} />} title="Revision Type">
                <Field label="Type" required>
                  <div className="flex flex-wrap gap-2">
                    {REVISION_TYPES.map(opt => (
                      <Controller key={opt.value} control={control} name="revision_type"
                        render={({ field }) => (
                          <button type="button" onClick={() => field.onChange(opt.value)}
                            className={`h-9 px-4 rounded-xl border text-xs font-semibold transition-all ${
                              field.value === opt.value
                                ? opt.active
                                : `bg-white border-gray-200 ${opt.color} hover:border-gray-300`
                            }`}>
                            {opt.label}
                          </button>
                        )}
                      />
                    ))}
                  </div>
                </Field>
              </Section>

              {/* ── Section 2: Assignment ── */}
              <Section icon={<UserCheck size={14} />} title="Assignment">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {/* Work Type */}
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

                  {/* Assigned To */}
                  <div className="sm:col-span-2">
                    <Field label={workType === "Inhouse" ? "Assigned Employee" : "Assigned Vendor"} error={errors.assigned_to_id?.message} required>
                      <Controller key={workType} control={control} name="assigned_to_id"
                        render={({ field }) => (
                          <SearchableSelect
                            options={assigneeOpts}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={workType === "Inhouse" ? "Search employee…" : "Search vendor…"}
                            error={!!errors.assigned_to_id}
                          />
                        )}
                      />
                      {assigneeOpts.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">No {workType === "Inhouse" ? "employees" : "vendors"} found.</p>
                      )}
                    </Field>
                  </div>
                </div>
              </Section>

              {/* ── Section 3: Languages ── */}
              <Section icon={<Globe size={14} />} title="Languages">
                {taskLanguages.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">No languages assigned to this task.</p>
                ) : (
                  <Controller control={control} name="language_ids"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">Select languages this revision covers</p>
                          <button type="button"
                            onClick={() => field.onChange(allSelected ? [] : allLangIds)}
                            className="text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors">
                            {allSelected ? "Clear all" : "Select all"}
                          </button>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 flex flex-wrap gap-1.5">
                          {taskLanguages.map(tl => {
                            const selected = field.value.includes(tl.language_id);
                            return (
                              <button key={tl.language_id} type="button"
                                onClick={() => field.onChange(
                                  selected
                                    ? field.value.filter(id => id !== tl.language_id)
                                    : [...field.value, tl.language_id]
                                )}
                                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                  selected
                                    ? "bg-violet-600 text-white shadow-sm"
                                    : "bg-white text-gray-600 border border-gray-200 hover:border-violet-300 hover:text-violet-600"
                                }`}>
                                {selected && <Check size={9} className="shrink-0" />}
                                {tl.languages?.language_name ?? tl.language_id}
                              </button>
                            );
                          })}
                        </div>
                        {langIds.length > 0 && (
                          <p className="text-xs text-violet-600 font-medium">
                            {langIds.length} language{langIds.length > 1 ? "s" : ""} selected
                          </p>
                        )}
                      </div>
                    )}
                  />
                )}
              </Section>

              {/* ── Section 4: Page & Payment ── */}
              <Section icon={<Calculator size={14} />} title="Page & Payment">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                  <Field label="Revision Pages" error={errors.revision_pages?.message} required>
                    <input type="number" min={1} {...register("revision_pages")}
                      placeholder="e.g. 20" className={inputCls(!!errors.revision_pages)} />
                  </Field>

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
                {paymentStatus === "Unpaid" && (
                  <p className="text-xs text-gray-400">Mark as Paid to enter a rate per page.</p>
                )}
              </Section>

              {/* ── Section 5: Notes ── */}
              <Section icon={<StickyNote size={14} />} title="Notes">
                <textarea {...register("revision_notes")} rows={3}
                  placeholder="What was revised and why…"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none resize-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-gray-400"
                />
              </Section>

            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80 shrink-0">
              <p className="text-xs text-gray-400">
                {isEdit ? "Changes will be saved immediately." : "Revision pages are tracked separately from the original task."}
              </p>
              <div className="flex gap-2.5">
                <button type="button" onClick={onClose}
                  className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="h-9 px-5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                  {isSubmitting && <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                  {isSubmitting ? "Saving…" : isEdit ? "Update Revision" : `Add Revision #${revisionNo}`}
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center h-6 w-6 rounded-md bg-violet-50 text-violet-600">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
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
  `h-9 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-gray-400 ${
    err ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-white"
  }`;
