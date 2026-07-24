"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Pencil, Trash2, Tag, Search } from "lucide-react";
import { toast } from "sonner";

import { fetchAllTaskTypes, deleteTaskType } from "@/services/taskTypeService";
import type { TaskType } from "@/types/database";
import TaskTypeModal from "@/components/task-types/TaskTypeModal";
import DeleteTaskTypeDialog from "@/components/task-types/DeleteTaskTypeDialog";

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
};

export default function SettingsPage() {
  const [taskTypes,    setTaskTypes]    = useState<TaskType[]>([]);
  const [fetching,     setFetching]     = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<TaskType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskType | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    try {
      setTaskTypes(await fetchAllTaskTypes());
    } catch {
      toast.error("Failed to load task types");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = taskTypes.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTaskType(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Failed to delete. This task type may be in use.");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (tt: TaskType) => { setEditTarget(tt); setModalOpen(true); };
  const handleModalClose = () => { setModalOpen(false); setEditTarget(null); };

  const activeCount   = taskTypes.filter(t => t.status === "active").length;
  const inactiveCount = taskTypes.filter(t => t.status === "inactive").length;

  return (
    <>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage task types used across the system</p>
          </div>
        </div>

        {/* Task Types section */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Tag size={16} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Task Types</h3>
                <p className="text-xs text-gray-400">
                  {fetching ? "Loading…" : `${taskTypes.length} total · ${activeCount} active · ${inactiveCount} inactive`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} title="Refresh"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => { setEditTarget(null); setModalOpen(true); }}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors"
              >
                <Plus size={14} />
                Add Task Type
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="relative max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search task types…"
                className="h-8 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fetching ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Tag size={28} className="opacity-30" />
                        <p className="text-sm font-medium">
                          {search ? "No task types match your search." : "No task types yet. Click \"Add Task Type\" to get started."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((tt, idx) => (
                    <tr key={tt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-400 tabular-nums">{idx + 1}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{tt.name}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs truncate">
                        {tt.description ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[tt.status]}`}>
                          {tt.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(tt)} title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(tt)} title="Delete"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!fetching && filtered.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60">
              <p className="text-xs text-gray-400">
                Showing {filtered.length} of {taskTypes.length} task type{taskTypes.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      <TaskTypeModal
        open={modalOpen}
        taskType={editTarget}
        onClose={handleModalClose}
        onSuccess={load}
      />

      <DeleteTaskTypeDialog
        open={!!deleteTarget}
        taskTypeName={deleteTarget?.name ?? ""}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
