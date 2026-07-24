"use client";

import { X, RefreshCw, RotateCcw, Pencil, Trash2, Plus } from "lucide-react";
import type { Task, TaskRevision } from "@/types/database";

// ── Config ────────────────────────────────────────────────────

const PAYMENT_STYLES: Record<string, string> = {
  Paid:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Unpaid: "bg-red-50 text-red-600 ring-1 ring-red-200",
};

const REVISION_TYPE_STYLES: Record<string, string> = {
  General:      "bg-gray-100 text-gray-700",
  Client:       "bg-blue-50 text-blue-700",
  QA:           "bg-indigo-50 text-indigo-700",
  Proofreading: "bg-teal-50 text-teal-700",
  Internal:     "bg-violet-50 text-violet-700",
};

// ── Props ─────────────────────────────────────────────────────

interface RevisionViewModalProps {
  open:      boolean;
  task:      Task;
  onClose:   () => void;
  onAdd:     () => void;
  onEdit:    (revision: TaskRevision) => void;
  onDelete:  (revisionId: string) => void;
}

// ── Component ─────────────────────────────────────────────────

export default function RevisionViewModal({
  open, task, onClose, onAdd, onEdit, onDelete,
}: RevisionViewModalProps) {
  if (!open) return null;

  const revisions   = task.task_revisions ?? [];
  const totalPages  = revisions.reduce((s, r) => s + r.revision_pages, 0);
  const totalAmount = revisions.reduce((s, r) => s + (r.revision_pages && r.rate_per_page ? r.revision_pages * r.rate_per_page : 0), 0);
  const paidCount   = revisions.filter(r => r.payment_status === "Paid").length;
  const unpaidCount = revisions.filter(r => r.payment_status === "Unpaid").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-2xl shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <RotateCcw size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">
              Revisions — {task.task_types?.name ?? "Task"}
            </h2>
            <p className="text-xs text-violet-200 mt-0.5">
              {revisions.length} revision{revisions.length !== 1 ? "s" : ""} · {totalPages} total pages
            </p>
          </div>
          <button
            onClick={onAdd}
            className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors"
          >
            <Plus size={13} /> Add Revision
          </button>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* ── Stats ── */}
        {revisions.length > 0 && (
          <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
            {[
              { label: "Total Revisions", value: revisions.length,  color: "text-violet-700", bg: "bg-violet-50" },
              { label: "Total Pages",     value: totalPages,         color: "text-amber-700",  bg: "bg-amber-50" },
              { label: "Paid",            value: paidCount,          color: "text-emerald-700",bg: "bg-emerald-50" },
              { label: "Total Amount",    value: totalAmount > 0 ? `₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—", color: "text-gray-900", bg: "bg-gray-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2.5`}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Task languages context ── */}
        {(task.task_languages?.length ?? 0) > 0 && (
          <div className="px-6 py-2.5 border-b border-gray-100 flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400 font-medium">Task languages:</span>
            <div className="flex flex-wrap gap-1">
              {task.task_languages!.map(tl => (
                <span key={tl.language_id} className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-200">
                  {tl.languages?.language_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {revisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <RefreshCw size={36} className="opacity-20" />
              <p className="text-sm font-medium">No revisions yet</p>
              <button onClick={onAdd}
                className="h-9 px-4 flex items-center gap-1.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
                <Plus size={15} /> Add First Revision
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {revisions.map((rev, idx) => {
                const amount = rev.revision_pages && rev.rate_per_page
                  ? rev.revision_pages * rev.rate_per_page : null;
                return (
                  <div key={rev.id} className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-4">

                      {/* Left: number + type */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${REVISION_TYPE_STYLES[rev.revision_type] ?? "bg-gray-100 text-gray-700"}`}>
                          {rev.revision_type}
                        </span>
                      </div>

                      {/* Middle: details */}
                      <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5">
                        <Detail label="Assigned To" value={rev.assigned_name ?? "—"} />
                        <Detail label="Work Type"   value={rev.work_type} />
                        <Detail label="Pages"       value={String(rev.revision_pages)} highlight />
                        <Detail label="Payment"
                          value={
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STYLES[rev.payment_status]}`}>
                              {rev.payment_status}
                            </span>
                          }
                        />
                        <Detail label="Rate / Page" value={rev.rate_per_page ? `₹${rev.rate_per_page}` : "—"} />
                        <Detail label="Amount"      value={amount ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"} highlight />
                        {rev.revision_notes && (
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-xs text-gray-400 font-medium mb-0.5">Notes</p>
                            <p className="text-xs text-gray-600">{rev.revision_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => onEdit(rev)} title="Edit"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => onDelete(rev.id)} title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {revisions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50/80 shrink-0">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span><span className="font-semibold text-gray-700">{totalPages}</span> total revision pages</span>
              {unpaidCount > 0 && (
                <span className="text-red-500 font-medium">{unpaidCount} unpaid</span>
              )}
            </div>
            <button onClick={onClose}
              className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail cell ───────────────────────────────────────────────

function Detail({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-xs mt-0.5 ${highlight ? "font-semibold text-gray-900" : "text-gray-600"}`}>{value}</p>
    </div>
  );
}
