"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "sonner";

import { insertClient, updateClient } from "@/services/clientService";
import type { Client } from "@/types/database";

// ── Schema ────────────────────────────────────────────────────

const schema = z.object({
  company_name:   z.string().min(1, "Company name is required").max(200),
  contact_person: z.string(),
  email:          z.string().email("Invalid email").or(z.literal("")),
  phone:          z.string(),
  address:        z.string(),
  country:        z.string(),
  status:         z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  company_name:   "",
  contact_person: "",
  email:          "",
  phone:          "",
  address:        "",
  country:        "",
  status:         "active",
};

// ── Props ─────────────────────────────────────────────────────

interface ClientModalProps {
  open:      boolean;
  client?:   Client | null;
  onClose:   () => void;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────

export default function ClientModal({ open, client, onClose, onSuccess }: ClientModalProps) {
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (client) {
      reset({
        company_name:   client.company_name,
        contact_person: client.contact_person ?? "",
        email:          client.email          ?? "",
        phone:          client.phone          ?? "",
        address:        client.address        ?? "",
        country:        client.country        ?? "",
        status:         client.status,
      });
    } else {
      reset(defaultValues);
    }
  }, [client, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        company_name:   values.company_name,
        contact_person: values.contact_person || null,
        email:          values.email          || null,
        phone:          values.phone          || null,
        address:        values.address        || null,
        country:        values.country        || null,
        status:         values.status,
      };

      if (isEdit) {
        await updateClient(client!.id, payload);
        toast.success(`"${values.company_name}" updated successfully`);
      } else {
        const code = await insertClient(payload);
        toast.success(`Client created — ${code}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl mx-4">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? "Edit Client" : "Add New Client"}
            </h2>
            {isEdit && client?.client_code && (
              <p className="text-xs text-gray-400 mt-0.5">{client.client_code}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">

          {/* Company Name */}
          <Field label="Company Name" error={errors.company_name?.message} required>
            <input
              {...register("company_name")}
              placeholder="e.g. Acme Corp"
              className={inputCls(!!errors.company_name)}
            />
          </Field>

          {/* Contact Person + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Person" error={errors.contact_person?.message}>
              <input
                {...register("contact_person")}
                placeholder="e.g. John Smith"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input
                {...register("email")}
                type="email"
                placeholder="e.g. john@acme.com"
                className={inputCls(!!errors.email)}
              />
            </Field>
          </div>

          {/* Phone + Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone" error={errors.phone?.message}>
              <input
                {...register("phone")}
                placeholder="e.g. +91 98765 43210"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Country" error={errors.country?.message}>
              <input
                {...register("country")}
                placeholder="e.g. India"
                className={inputCls(false)}
              />
            </Field>
          </div>

          {/* Address */}
          <Field label="Address" error={errors.address?.message}>
            <textarea
              {...register("address")}
              rows={2}
              placeholder="Street, City, State…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </Field>

          {/* Status */}
          <Field label="Status" error={errors.status?.message}>
            <select {...register("status")} className={selectCls(false)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? "Saving…" : isEdit ? "Update Client" : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function Field({
  label, error, required, children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

const inputCls = (err: boolean) =>
  `h-9 w-full rounded-lg border px-3 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${
    err ? "border-red-400" : "border-gray-200"
  }`;

const selectCls = (err: boolean) =>
  `h-9 w-full rounded-lg border px-3 text-sm outline-none transition-colors focus:border-blue-400 bg-white ${
    err ? "border-red-400" : "border-gray-200"
  }`;
