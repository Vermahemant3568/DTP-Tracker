"use client";

import { X, Trash2 } from "lucide-react";

interface DeleteClientDialogProps {
  open:        boolean;
  clientName:  string;
  loading:     boolean;
  onConfirm:   () => void;
  onCancel:    () => void;
}

export default function DeleteClientDialog({
  open, clientName, loading, onConfirm, onCancel,
}: DeleteClientDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl mx-4 p-6">
        <button onClick={onCancel} className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
          <X size={16} className="text-gray-400" />
        </button>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>

        <h3 className="text-base font-semibold text-gray-900">Delete Client</h3>
        <p className="mt-1.5 text-sm text-gray-500">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-800">"{clientName}"</span>?
          This action cannot be undone.
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-9 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
