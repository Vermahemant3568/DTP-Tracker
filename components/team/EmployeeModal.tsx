"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "sonner";

import { insertEmployee, updateEmployee } from "@/services/employeeService";
import type { Employee } from "@/types/database";

const schema = z.object({
  full_name:   z.string().min(1, "Full name is required").max(200),
  email:       z.string().email("Invalid email").or(z.literal("")).default(""),
  phone:       z.string().default(""),
  designation: z.string().default(""),
  role:        z.enum(["coordinator", "dtp_team", "custom"]).default("dtp_team"),
  status:      z.enum(["active", "inactive"]).default("active"),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  full_name:   "",
  email:       "",
  phone:       "",
  designation: "",
  role:        "dtp_team",
  status:      "active",
};

const ROLES = [
  { value: "coordinator", label: "Coordinator", hint: "Project owner, not assignable to tasks" },
  { value: "dtp_team",    label: "DTP Team",    hint: "Inhouse team, assignable to tasks"      },
  { value: "custom",      label: "Custom",      hint: "Enter a custom role title below"        },
] as const;

const HINT_COLORS: Record<string, string> = {
  coordinator: "bg-blue-50 text-blue-700 border-blue-100",
  dtp_team:    "bg-purple-50 text-purple-700 border-purple-100",
  custom:      "bg-gray-50 text-gray-600 border-gray-200",
};

interface EmployeeModalProps {
  open:      boolean;
  employee?: Employee | null;
  onClose:   () => void;
  onSuccess: () => void;
}

export default function EmployeeModal({ open, employee, onClose, onSuccess }: EmployeeModalProps) {
  const isEdit = !!employee;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const role = watch("role");

  useEffect(() => {
    if (employee) {
      reset({
        full_name:   employee.full_name,
        email:       employee.email       ?? "",
        phone:       employee.phone       ?? "",
        designation: employee.designation ?? "",
        role:        employee.role,
        status:      employee.status,
      });
    } else {
      reset(defaultValues);
    }
  }, [employee, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        full_name:   values.full_name,
        email:       values.email       || null,
        phone:       values.phone       || null,
        designation: values.designation || null,
        role:        values.role,
        status:      values.status,
      };
      if (isEdit) {
        await updateEmployee(employee!.id, payload);
        toast.success(`"${values.full_name}" updated successfully`);
      } else {
        const code = await insertEmployee(payload);
        toast.success(`Team member added — ${code}`);
        reset(defaultValues);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  const hint = ROLES.find((r) => r.value === role)?.hint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl mx-4">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? "Edit Team Member" : "Add Team Member"}
            </h2>
            {isEdit && employee?.employee_code && (
              <p className="text-xs text-gray-400 mt-0.5">{employee.employee_code}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">

          {/* Full Name */}
          <Field label="Full Name" error={errors.full_name?.message} required>
            <input {...register("full_name")} placeholder="e.g. Ravi Kumar" className={inputCls(!!errors.full_name)} />
          </Field>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" error={errors.email?.message}>
              <input {...register("email")} type="email" placeholder="e.g. ravi@company.com" className={inputCls(!!errors.email)} />
            </Field>
            <Field label="Phone">
              <input {...register("phone")} placeholder="e.g. +91 98765 43210" className={inputCls(false)} />
            </Field>
          </div>

          {/* Role */}
          <Field label="Role" error={errors.role?.message} required>
            <select {...register("role")} className={selectCls(false)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>

          {/* Role hint */}
          {hint && (
            <p className={`text-xs px-3 py-2 rounded-lg border ${HINT_COLORS[role]}`}>
              ℹ️ {hint}
            </p>
          )}

          {/* Designation — always visible but labelled differently for custom */}
          <Field
            label={role === "custom" ? "Role Title" : "Designation"}
            error={errors.designation?.message}
            required={role === "custom"}
          >
            <input
              {...register("designation")}
              placeholder={role === "custom" ? "e.g. QA Analyst, Pre-press Operator…" : "e.g. Senior Designer"}
              className={inputCls(role === "custom" && !!errors.designation)}
            />
          </Field>

          {/* Status */}
          <Field label="Status">
            <select {...register("status")} className={selectCls(false)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="h-9 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {isSubmitting ? "Saving…" : isEdit ? "Update Member" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

const inputCls  = (err: boolean) => `h-9 w-full rounded-lg border px-3 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${err ? "border-red-400" : "border-gray-200"}`;
const selectCls = (err: boolean) => `h-9 w-full rounded-lg border px-3 text-sm outline-none transition-colors focus:border-blue-400 bg-white ${err ? "border-red-400" : "border-gray-200"}`;
