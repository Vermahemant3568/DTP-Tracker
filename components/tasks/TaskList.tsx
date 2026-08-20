"use client";

import { useState, Fragment } from "react";
import { ExternalLink, Pencil, Trash2, ChevronDown, ChevronRight, Plus, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Task, TaskRevision } from "@/types/database";
import { deleteRevision } from "@/services/revisionService";
import RevisionModal from "@/components/tasks/RevisionModal";
import RevisionViewModal from "@/components/tasks/RevisionViewModal";
import TaskViewModal from "@/components/tasks/TaskViewModal";

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

// Task type → color pill
const TASK_TYPE_STYLES: Record<string, string> = {
  DTP:          "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Translation:  "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  Proofreading: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  QA:           "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  Typesetting:  "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  Scanning:     "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  OCR:          "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
  Editing:      "bg-lime-50 text-lime-700 ring-1 ring-lime-200",
};
const TASK_TYPE_DEFAULT = "bg-gray-100 text-gray-600 ring-1 ring-gray-200";

// ── Props ─────────────────────────────────────────────────────

interface TaskListProps {
  tasks:     Task[];
  loading:   boolean;
  onEdit:    (task: Task) => void;
  onDelete:  (task: Task) => void;
  onRefresh: () => void;
  onAddTask: () => void;
}

// ── Component ─────────────────────────────────────────────────

export default function TaskList({ tasks, loading, onEdit, onDelete, onRefresh, onAddTask }: TaskListProps) {
  const [expanded,        setExpanded]        = useState<Record<string, boolean>>({});
  const [revModalTask,     setRevModalTask]     = useState<Task | null>(null);
  const [editRevision,     setEditRevision]     = useState<TaskRevision | null>(null);
  const [viewModalTask,    setViewModalTask]    = useState<Task | null>(null);
  const [viewTask,         setViewTask]         = useState<Task | null>(null);

  const toggleExpand = (taskId: string) =>
    setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }));

  const handleDeleteRevision = async (revId: string) => {
    if (!confirm("Delete this revision?")) return;
    try {
      await deleteRevision(revId);
      toast.success("Revision deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete revision");
    }
  };

  const openAddRevision = (task: Task) => {
    setEditRevision(null);
    setRevModalTask(task);
    setViewModalTask(null);
  };

  const openEditRevision = (task: Task, rev: TaskRevision) => {
    setEditRevision(rev);
    setRevModalTask(task);
    setViewModalTask(null);
  };

  const calcAmount = (pages: number | null, rate: number | null) =>
    pages && rate ? pages * rate : null;

  return (
    <>
      {/* ── Table ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-3 w-8" />
                <th className="px-4 py-3 whitespace-nowrap">#</th>
                <th className="px-4 py-3 whitespace-nowrap">Task Type</th>
                <th className="px-4 py-3 whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3 whitespace-nowrap">Work Type</th>
                <th className="px-4 py-3 whitespace-nowrap">Languages</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Src Pages</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">No. Langs</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Final Pages</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Rev Pages</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Rate</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Amount</th>
                <th className="px-4 py-3 whitespace-nowrap">Payment</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Received</th>
                <th className="px-4 py-3 whitespace-nowrap">Delivery</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 17 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 rounded bg-gray-100 animate-pulse" style={{ width: `${60 + (j * 13) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-14 text-center">
                    <p className="text-sm text-gray-400 mb-3">No tasks yet.</p>
                    <button
                      onClick={onAddTask}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={15} /> Add First Task
                    </button>
                  </td>
                </tr>
              ) : (
                tasks.map((task, idx) => {
                  const isOpen     = !!expanded[task.id];
                  const revisions  = task.task_revisions ?? [];
                  const revPages   = task.total_revision_pages ?? 0;
                  const finalPages = task.final_pages ?? (
                    task.source_pages && task.task_languages?.length
                      ? task.source_pages * task.task_languages.length
                      : null
                  );
                  const taskAmount = calcAmount(finalPages, task.rate_per_page);
                  const revAmount  = revisions.reduce((s, r) => s + (calcAmount(r.revision_pages, r.rate_per_page) ?? 0), 0);
                  const totalAmount = (taskAmount ?? 0) + revAmount;
                  const typeName   = task.task_types?.name ?? "";
                  const typeStyle  = TASK_TYPE_STYLES[typeName] ?? TASK_TYPE_DEFAULT;
                  const rowBg      = idx % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                  return (
                    <Fragment key={task.id}>
                      {/* ── Task row ── */}
                      <tr className={`${rowBg} hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0`}>

                        {/* Expand toggle */}
                        <td className="px-3 py-3.5">
                          <button
                            onClick={() => toggleExpand(task.id)}
                            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 transition-colors"
                          >
                            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeStyle}`}>
                            {typeName || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs font-medium">
                          {task.assigned_name ?? "—"}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            task.work_type === "Inhouse"
                              ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                              : "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
                          }`}>
                            {task.work_type}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {!task.task_languages?.length ? <span className="text-gray-300 text-xs">—</span> : (
                            <div className="flex flex-wrap gap-1">
                              {task.task_languages.slice(0, 2).map((tl) => (
                                <span key={tl.language_id} className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-200 whitespace-nowrap">
                                  {tl.languages?.language_name}
                                </span>
                              ))}
                              {task.task_languages.length > 2 && (
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                  +{task.task_languages.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-500 text-right text-xs">{task.source_pages ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 text-right text-xs">{task.number_of_languages ?? task.task_languages?.length ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-900 font-semibold text-right text-xs">{finalPages ?? "—"}</td>

                        {/* Revision pages badge */}
                        <td className="px-4 py-3 text-right">
                          {revPages > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <RotateCcw size={10} />{revPages}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>

                        <td className="px-4 py-3 text-gray-500 text-right text-xs">
                          {task.rate_per_page ? `₹${task.rate_per_page}` : "—"}
                        </td>

                        <td className="px-4 py-3 text-right text-xs">
                          <div className="flex flex-col items-end gap-0.5">
                            {taskAmount ? (
                              <span className="text-gray-600">T: ₹{taskAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            ) : null}
                            {revAmount > 0 ? (
                              <span className="text-amber-600 font-medium">R: ₹{revAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            ) : null}
                            {taskAmount && revAmount > 0 ? (
                              <span className="font-bold text-gray-900 border-t border-gray-200 pt-0.5 mt-0.5">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            ) : (!taskAmount && revAmount === 0) ? <span className="text-gray-300">—</span> : null}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STYLES[task.payment_status]}`}>
                            {task.payment_status}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[task.status]}`}>
                            {STATUS_LABELS[task.status]}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {task.task_received_date
                            ? new Date(task.task_received_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : <span className="text-gray-300">—</span>}
                        </td>

                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {task.task_delivery_date
                            ? new Date(task.task_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : <span className="text-gray-300">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {task.deliverable_link && (
                              <a href={task.deliverable_link} target="_blank" rel="noopener noreferrer" title="View deliverable"
                                className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                <ExternalLink size={13} />
                              </a>
                            )}
                            {/* Single smart revision button */}
                            <button
                              onClick={() => revisions.length > 0 ? setViewModalTask(task) : openAddRevision(task)}
                              title={revisions.length > 0 ? `${revisions.length} revision${revisions.length > 1 ? "s" : ""} — click to view` : "Add revision"}
                              className="relative flex h-7 items-center justify-center rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors px-2 gap-1"
                            >
                              <RotateCcw size={13} />
                              {revisions.length > 0 ? (
                                <span className="text-xs font-semibold">{revisions.length}</span>
                              ) : (
                                <Plus size={10} />
                              )}
                            </button>
                            <button onClick={() => setViewTask(task)} title="View task detail"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                              <Eye size={13} />
                            </button>
                            <button onClick={() => onEdit(task)} title="Edit task"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => onDelete(task)} title="Delete task"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Revisions expanded panel ── */}
                      {isOpen && (
                        <tr key={`${task.id}-revisions`}>
                          <td colSpan={17} className="px-0 py-0 bg-amber-50/40">
                            <div className="px-10 py-3 space-y-2">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                                  <RotateCcw size={11} /> Revisions ({revisions.length})
                                </p>
                                <button
                                  onClick={() => { setEditRevision(null); setRevModalTask(task); }}
                                  className="h-7 px-2.5 flex items-center gap-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors"
                                >
                                  <Plus size={11} /> Add Revision
                                </button>
                              </div>

                              {revisions.length === 0 ? (
                                <p className="text-xs text-gray-400 py-2">No revisions yet.</p>
                              ) : (
                                <div className="rounded-lg border border-amber-200 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-amber-100 text-amber-800 text-left">
                                        <th className="px-3 py-2">Assigned To</th>
                                        <th className="px-3 py-2">Work Type</th>
                                        <th className="px-3 py-2 text-right">Rev Pages</th>
                                        <th className="px-3 py-2 text-right">Rate</th>
                                        <th className="px-3 py-2 text-right">Amount</th>
                                        <th className="px-3 py-2">Payment</th>
                                        <th className="px-3 py-2">Notes</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-100 bg-white">
                                      {revisions.map((rev) => {
                                        const revAmt = calcAmount(rev.revision_pages, rev.rate_per_page);
                                        return (
                                          <tr key={rev.id} className="hover:bg-amber-50/50">
                                            <td className="px-3 py-2 font-medium text-gray-800">{rev.assigned_name ?? "—"}</td>
                                            <td className="px-3 py-2">
                                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${rev.work_type === "Inhouse" ? "bg-violet-50 text-violet-700" : "bg-orange-50 text-orange-700"}`}>
                                                {rev.work_type}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-amber-700">{rev.revision_pages}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{rev.rate_per_page ? `₹${rev.rate_per_page}` : "—"}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                                              {revAmt ? `₹${revAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STYLES[rev.payment_status]}`}>
                                                {rev.payment_status}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{rev.revision_notes ?? "—"}</td>
                                            <td className="px-3 py-2">
                                              <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEditRevision(task, rev)} title="Edit revision"
                                                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                  <Pencil size={11} />
                                                </button>
                                                <button onClick={() => handleDeleteRevision(rev.id)} title="Delete revision"
                                                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    {/* Revision subtotal */}
                                    <tfoot>
                                      <tr className="bg-amber-50 border-t border-amber-200 font-semibold text-amber-800">
                                        <td colSpan={2} className="px-3 py-2">Revision Total</td>
                                        <td className="px-3 py-2 text-right">{revPages}</td>
                                        <td className="px-3 py-2" />
                                        <td className="px-3 py-2 text-right">
                                          {revisions.reduce((s, r) => s + (calcAmount(r.revision_pages, r.rate_per_page) ?? 0), 0) > 0
                                            ? `₹${revisions.reduce((s, r) => s + (calcAmount(r.revision_pages, r.rate_per_page) ?? 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                            : "—"}
                                        </td>
                                        <td colSpan={3} className="px-3 py-2" />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task View Modal */}
      {viewTask && (
        <TaskViewModal
          open={!!viewTask}
          task={viewTask}
          onClose={() => setViewTask(null)}
          onEdit={() => { setViewTask(null); onEdit(viewTask); }}
        />
      )}

      {/* Revision Add/Edit Modal */}
      <RevisionModal
        open={!!revModalTask}
        taskId={revModalTask?.id ?? ""}
        revisionNo={(revModalTask?.task_revisions?.length ?? 0) + (editRevision ? 0 : 1)}
        taskLanguages={revModalTask?.task_languages ?? []}
        revision={editRevision}
        onClose={() => { setRevModalTask(null); setEditRevision(null); }}
        onSuccess={() => { setRevModalTask(null); setEditRevision(null); onRefresh(); }}
      />

      {/* Revision View Modal */}
      {viewModalTask && (
        <RevisionViewModal
          open={!!viewModalTask}
          task={viewModalTask}
          onClose={() => setViewModalTask(null)}
          onAdd={() => openAddRevision(viewModalTask)}
          onEdit={(rev) => openEditRevision(viewModalTask, rev)}
          onDelete={async (revId) => {
            if (!confirm("Delete this revision?")) return;
            try {
              await deleteRevision(revId);
              toast.success("Revision deleted");
              setViewModalTask(null);
              onRefresh();
            } catch {
              toast.error("Failed to delete revision");
            }
          }}
        />
      )}
    </>
  );
}


