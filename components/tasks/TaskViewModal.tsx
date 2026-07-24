"use client";

import { X, ClipboardList, UserCheck, Calculator, Globe, Link2, StickyNote, RotateCcw, ExternalLink, Pencil } from "lucide-react";
import type { Task } from "@/types/database";

// ── Config ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  in_progress: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  completed:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_hold:     "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  cancelled:   "bg-red-50 text-red-600 ring-1 ring-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed",
  on_hold: "On Hold", cancelled: "Cancelled",
};
const PAYMENT_STYLES: Record<string, string> = {
  Paid:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Unpaid: "bg-red-50 text-red-600 ring-1 ring-red-200",
};
const TASK_TYPE_STYLES: Record<string, string> = {
  DTP:          "bg-blue-50 text-blue-700",
  Translation:  "bg-violet-50 text-violet-700",
  Proofreading: "bg-teal-50 text-teal-700",
  QA:           "bg-indigo-50 text-indigo-700",
  Typesetting:  "bg-cyan-50 text-cyan-700",
  Scanning:     "bg-orange-50 text-orange-700",
  OCR:          "bg-pink-50 text-pink-700",
  Editing:      "bg-lime-50 text-lime-700",
};
const REVISION_TYPE_STYLES: Record<string, string> = {
  General:      "bg-gray-100 text-gray-700",
  Client:       "bg-blue-50 text-blue-700",
  QA:           "bg-indigo-50 text-indigo-700",
  Proofreading: "bg-teal-50 text-teal-700",
  Internal:     "bg-violet-50 text-violet-700",
};

// ── Props ─────────────────────────────────────────────────────

interface TaskViewModalProps {
  open:    boolean;
  task:    Task;
  onClose: () => void;
  onEdit:  () => void;
}

// ── Component ─────────────────────────────────────────────────

export default function TaskViewModal({ open, task, onClose, onEdit }: TaskViewModalProps) {
  if (!open) return null;

  const revisions      = task.task_revisions ?? [];
  const taskAmount     = task.final_pages && task.rate_per_page ? task.final_pages * task.rate_per_page : null;
  const revTotal       = revisions.reduce((s, r) => s + r.revision_pages, 0);
  const revAmount      = revisions.reduce((s, r) => s + (r.revision_pages && r.rate_per_page ? r.revision_pages * r.rate_per_page : 0), 0);
  const totalPages     = (task.final_pages ?? 0) + revTotal;
  const totalAmount    = (taskAmount ?? 0) + revAmount;
  const typeName       = task.task_types?.name ?? "—";
  const typeStyle      = TASK_TYPE_STYLES[typeName] ?? "bg-gray-100 text-gray-600";

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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">{typeName}</h2>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeStyle}`}>
                {typeName}
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Task detail view · Created {new Date(task.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <button onClick={onEdit}
            className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <Stat label="Final Pages"    value={task.final_pages ?? "—"}  color="indigo" />
          <Stat label="Revision Pages" value={revTotal || "—"}          color="amber"  />
          <Stat label="Total Pages"    value={totalPages || "—"}        color="purple" />
          <Stat
            label="Total Amount"
            value={totalAmount > 0 ? `₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
            color="emerald"
          />
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">

            {/* ── Section: Assignment ── */}
            <Section icon={<UserCheck size={14} />} title="Assignment">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Detail label="Work Type">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    task.work_type === "Inhouse"
                      ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                      : "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
                  }`}>
                    {task.work_type === "Inhouse" ? "🏢 Inhouse" : "🤝 Vendor"}
                  </span>
                </Detail>
                <Detail label="Assigned To">
                  <span className="text-sm font-medium text-gray-900">{task.assigned_name ?? "—"}</span>
                </Detail>
                <Detail label="Status">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </Detail>
                <Detail label="Payment Status">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STYLES[task.payment_status]}`}>
                    {task.payment_status}
                  </span>
                </Detail>
                <Detail label="Rate Per Page">
                  <span className="text-sm font-medium text-gray-900">
                    {task.rate_per_page ? `₹${task.rate_per_page}` : "—"}
                  </span>
                </Detail>
                <Detail label="Task Amount">
                  <span className="text-sm font-semibold text-indigo-700">
                    {taskAmount ? `₹${taskAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                  </span>
                </Detail>
              </div>
            </Section>

            {/* ── Section: Page Counts ── */}
            <Section icon={<Calculator size={14} />} title="Page Counts">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Detail label="Source Pages">
                  <span className="text-sm font-medium text-gray-900">{task.source_pages ?? "—"}</span>
                </Detail>
                <Detail label="No. of Languages">
                  <span className="text-sm font-medium text-gray-900">{task.number_of_languages ?? "—"}</span>
                </Detail>
                <Detail label="Final Pages">
                  <span className="text-sm font-bold text-indigo-700">{task.final_pages ?? "—"}</span>
                </Detail>
                <Detail label="Revision Pages">
                  <span className="text-sm font-bold text-amber-600">{revTotal || "—"}</span>
                </Detail>
              </div>
            </Section>

            {/* ── Section: Languages ── */}
            <Section icon={<Globe size={14} />} title="Task Languages">
              {!task.task_languages?.length ? (
                <p className="text-sm text-gray-400">No languages assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {task.task_languages.map(tl => (
                    <span key={tl.language_id}
                      className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
                      {tl.languages?.language_name}
                    </span>
                  ))}
                </div>
              )}
            </Section>

            {/* ── Section: Links ── */}
            {(task.source_file_link || task.deliverable_link) && (
              <Section icon={<Link2 size={14} />} title="Links">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.source_file_link && (
                    <a href={task.source_file_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                      <ExternalLink size={14} className="shrink-0" />
                      <span className="truncate">Source File</span>
                    </a>
                  )}
                  {task.deliverable_link && (
                    <a href={task.deliverable_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors group">
                      <ExternalLink size={14} className="shrink-0" />
                      <span className="truncate">Deliverable</span>
                    </a>
                  )}
                </div>
              </Section>
            )}

            {/* ── Section: Notes ── */}
            {task.task_notes && (
              <Section icon={<StickyNote size={14} />} title="Notes">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                  {task.task_notes}
                </p>
              </Section>
            )}

            {/* ── Section: Revisions ── */}
            <Section icon={<RotateCcw size={14} />} title={`Revisions (${revisions.length})`}>
              {revisions.length === 0 ? (
                <p className="text-sm text-gray-400">No revisions for this task.</p>
              ) : (
                <div className="space-y-2">
                  {revisions.map((rev, idx) => {
                    const amt = rev.revision_pages && rev.rate_per_page ? rev.revision_pages * rev.rate_per_page : null;
                    return (
                      <div key={rev.id} className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${REVISION_TYPE_STYLES[rev.revision_type] ?? "bg-gray-100 text-gray-700"}`}>
                            {rev.revision_type}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STYLES[rev.payment_status]}`}>
                            {rev.payment_status}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">
                            {new Date(rev.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
                          <Detail label="Assigned To"  value={rev.assigned_name ?? "—"} />
                          <Detail label="Work Type"    value={rev.work_type} />
                          <Detail label="Pages"        value={String(rev.revision_pages)} bold />
                          <Detail label="Amount"       value={amt ? `₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"} bold />
                        </div>
                        {rev.revision_notes && (
                          <p className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">{rev.revision_notes}</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Revision total row */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700">Revision Total</span>
                    <div className="flex items-center gap-6">
                      <span className="text-xs text-amber-700"><span className="font-bold">{revTotal}</span> pages</span>
                      {revAmount > 0 && (
                        <span className="text-xs font-bold text-amber-700">
                          ₹{revAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Section>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50/80 shrink-0">
          <p className="text-xs text-gray-400">
            Last updated {new Date(task.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium">
              Close
            </button>
            <button onClick={onEdit}
              className="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2">
              <Pencil size={14} /> Edit Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center h-6 w-6 rounded-md bg-indigo-50 text-indigo-600">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      {children}
    </div>
  );
}

function Detail({ label, value, bold, children }: {
  label: string; value?: string; bold?: boolean; children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      {children ?? (
        <p className={`text-sm ${bold ? "font-bold text-gray-900" : "text-gray-700"}`}>{value}</p>
      )}
    </div>
  );
}

function Stat({ label, value, color }: {
  label: string; value: string | number;
  color: "indigo" | "amber" | "purple" | "emerald";
}) {
  const cls = {
    indigo:  "bg-indigo-50 text-indigo-700",
    amber:   "bg-amber-50 text-amber-700",
    purple:  "bg-purple-50 text-purple-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[color];
  return (
    <div className={`rounded-xl px-4 py-3 ${cls}`}>
      <p className="text-xs opacity-70 font-medium">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
