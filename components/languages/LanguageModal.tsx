"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertTriangle, Globe } from "lucide-react";
import { toast } from "sonner";

import { insertLanguage, updateLanguage } from "@/services/languageService";
import type { Language } from "@/types/database";

// ── Schema ────────────────────────────────────────────────────

const schema = z.object({
  language_name: z.string().min(1, "Language name is required").max(100),
  language_code: z.string().max(10).default(""),
  language_type: z.enum(["source", "target", "both"]).default("both"),
  status:        z.enum(["active", "inactive"]).default("active"),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  language_name: "",
  language_code: "",
  language_type: "both",
  status:        "active",
};

// ── Type config ───────────────────────────────────────────────

const TYPE_OPTIONS: { value: FormValues["language_type"]; label: string; desc: string; active: string }[] = [
  { value: "source", label: "Source",      desc: "Used as source language only",        active: "bg-blue-600 border-blue-600 text-white shadow-sm" },
  { value: "target", label: "Target",      desc: "Used as target language only",        active: "bg-violet-600 border-violet-600 text-white shadow-sm" },
  { value: "both",   label: "Source & Target", desc: "Can be used as both",             active: "bg-teal-600 border-teal-600 text-white shadow-sm" },
];

// ── Props ─────────────────────────────────────────────────────

interface LanguageModalProps {
  open:      boolean;
  language?: Language | null;
  onClose:   () => void;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────

export default function LanguageModal({ open, language, onClose, onSuccess }: LanguageModalProps) {
  const isEdit = !!language;

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const langType = watch("language_type");

  useEffect(() => {
    if (language) {
      reset({
        language_name: language.language_name,
        language_code: language.language_code ?? "",
        language_type: language.language_type,
        status:        language.status,
      });
    } else {
      reset(defaultValues);
    }
  }, [language, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await updateLanguage(language!.id, values);
        toast.success(`"${values.language_name}" updated`);
      } else {
        await insertLanguage(values);
        toast.success(`"${values.language_name}" added`);
        reset(defaultValues);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  const activeTypeOpt = TYPE_OPTIONS.find(t => t.value === langType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Globe size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">
              {isEdit ? "Edit Language" : "Add Language"}
            </h2>
            <p className="text-xs text-teal-200 mt-0.5">
              {isEdit ? `Editing: ${language?.language_name}` : "Add a language to the system"}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          <Field label="Language Name" error={errors.language_name?.message} required>
            <input
              {...register("language_name")}
              placeholder="e.g. French"
              autoFocus
              className={inputCls(!!errors.language_name)}
            />
          </Field>

          <Field label="Language Code" error={errors.language_code?.message}>
            <input
              {...register("language_code")}
              placeholder="e.g. fr"
              className={inputCls(!!errors.language_code)}
            />
            <p className="text-xs text-gray-400 mt-1">ISO 639-1 code (optional, e.g. en, fr, de)</p>
          </Field>

          {/* Language Type */}
          <Field label="Language Type" required>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(opt => (
                <Controller key={opt.value} control={control} name="language_type"
                  render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`flex-1 h-9 rounded-xl border text-xs font-semibold transition-all ${
                        field.value === opt.value
                          ? opt.active
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  )}
                />
              ))}
            </div>
            {activeTypeOpt && (
              <p className="text-xs text-gray-400 mt-1">{activeTypeOpt.desc}</p>
            )}
          </Field>

          <Field label="Status" required>
            <select {...register("status")} className={selectCls(false)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {isEdit ? "Changes saved immediately." : "Language will be available system-wide."}
            </p>
            <div className="flex gap-2.5">
              <button type="button" onClick={onClose}
                className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="h-9 px-5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                {isSubmitting && <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {isSubmitting ? "Saving…" : isEdit ? "Update Language" : "Add Language"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

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
  `h-9 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder-gray-400 ${
    err ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-white"
  }`;

const selectCls = (err: boolean) =>
  `h-9 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white ${
    err ? "border-red-300" : "border-gray-200"
  }`;
