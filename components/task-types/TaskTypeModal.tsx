"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertTriangle, Tag } from "lucide-react";
import { toast } from "sonner";

import { insertTaskType, updateTaskType } from "@/services/taskTypeService";
import type { TaskType } from "@/types/database";

const schema = z.object({
  name:        z.string().min(1, "Name is required").max(100),
  description: z.string(),
  status:      z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { name: "", description: "", status: "active" };

interface Props {
  open:      boolean;
  taskType?: TaskType | null;
  onClose:   () => void;
  onSuccess: () => void;
}

export default function TaskTypeModal({ open, taskType, onClose, onSuccess }: Props) {
  const isEdit = !!taskType;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  useEffect(() => {
    if (taskType) {
      reset({ name: taskType.name, description: taskType.description ?? "", status: taskType.status });
    } else {
      reset(defaultValues);
    }
  }, [taskType, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await updateTaskType(taskType!.id, values);
        toast.success(`"${values.name}" updated`);
      } else {
        await insertTaskType(values);
        toast.success(`"${values.name}" added`);
        reset(defaultValues);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-2xl">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Tag size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">{isEdit ? "Edit Task Type" : "Add Task Type"}</h2>
            <p className="text-xs text-violet-200 mt-0.5">
              {isEdit ? `Editing: ${taskType?.name}` : "Add a new task type to the system"}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <Field label="Name" error={errors.name?.message} required>
            <input {...register("name")} placeholder="e.g. Translation" autoFocus className={inputCls(!!errors.name)} />
          </Field>

          <Field label="Description" error={errors.description?.message}>
            <textarea {...register("description")} rows={2} placeholder="Optional description…"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none resize-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-gray-400"
            />
          </Field>

          <Field label="Status" required>
            <select {...register("status")} className={selectCls(false)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="h-9 px-5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center gap-2">
              {isSubmitting && <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {isSubmitting ? "Saving…" : isEdit ? "Update" : "Add Task Type"}
            </button>
          </div>
        </form>
      </div>
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
  `h-9 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-gray-400 ${
    err ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-white"
  }`;

const selectCls = (err: boolean) =>
  `h-9 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white ${
    err ? "border-red-300" : "border-gray-200"
  }`;
