"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

import { completeJob } from "@/services/jobService";
import type { Job } from "@/types/database";

const schema = z.object({
  job_code: z.string().min(1, "Job code is required"),
  notes:    z.string().default(""),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { job_code: "", notes: "" };

interface JobCodeModalProps {
  open:      boolean;
  job:       Job | null;
  onClose:   () => void;
  onSuccess: () => void;
}

export default function JobCodeModal({ open, job, onClose, onSuccess }: JobCodeModalProps) {
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  useEffect(() => {
    if (job) {
      reset({ job_code: job.job_code ?? "", notes: job.notes ?? "" });
    } else {
      reset(defaultValues);
    }
  }, [job, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await completeJob(job!.id, values);
      toast.success(`Job code saved — ${values.job_code}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open || !job) return null;

  const task    = job.tasks;
  const project = task?.projects;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Enter Job Code</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mark this job as completed once the code is received</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Context strip */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Project</span>
            <span className="font-medium text-gray-800">{project?.project_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Project Code</span>
            <span className="font-mono text-gray-500">{project?.project_code ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Task Type</span>
            <span className="font-medium text-gray-800">{task?.task_types?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Assigned To</span>
            <span className="font-medium text-gray-800">{job.assigned_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Pages</span>
            <span className="font-medium text-gray-800">{task?.final_pages ?? "—"}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Job Code <span className="text-red-500">*</span>
            </label>
            <input
              {...register("job_code")}
              placeholder="e.g. JOB-2025-00123"
              autoFocus
              className={`h-9 w-full rounded-lg border px-3 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${errors.job_code ? "border-red-400" : "border-gray-200"}`}
            />
            {errors.job_code && <p className="text-xs text-red-500">{errors.job_code.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Notes</label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Any additional notes…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="h-9 px-5 flex items-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              <BadgeCheck size={15} />
              {isSubmitting ? "Saving…" : "Save & Complete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
