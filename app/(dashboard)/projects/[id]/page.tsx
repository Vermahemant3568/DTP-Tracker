"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, RefreshCw, User, Building2,
  CalendarDays, FileText, StickyNote, CheckSquare, RotateCcw, Globe,
} from "lucide-react";
import { toast } from "sonner";

import { fetchProjects, updateProjectStatus } from "@/services/projectService";
import { fetchTasks, deleteTask } from "@/services/taskService";
import type { Project, Task } from "@/types/database";

import TaskModal           from "@/components/tasks/TaskModal";
import TaskList            from "@/components/tasks/TaskList";
import DeleteConfirmDialog from "@/components/projects/DeleteConfirmDialog";

// ── Config ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  in_progress: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  completed:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_hold:     "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  cancelled:   "bg-red-50 text-red-600 ring-1 ring-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending:     "Pending",
  in_progress: "In Progress",
  completed:   "Completed",
  on_hold:     "On Hold",
  cancelled:   "Cancelled",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmt(date: string) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;
}

// ── Page ──────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project,       setProject]       = useState<Project | null>(null);
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [loadingProj,   setLoadingProj]   = useState(true);
  const [loadingTasks,  setLoadingTasks]  = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTask,      setEditTask]      = useState<Task | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Task | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    setLoadingProj(true);
    fetchProjects()
      .then((all) => setProject(all.find((p) => p.id === id) ?? null))
      .catch(() => toast.error("Failed to load project"))
      .finally(() => setLoadingProj(false));
  }, [id]);

  const loadTasks = useCallback(async () => {
    if (!id) return;
    setLoadingTasks(true);
    try {
      const fetched = await fetchTasks(id);
      setTasks(fetched);

      if (fetched.length > 0 && project) {
        const allDone = fetched.every(t => t.status === "completed" || t.status === "cancelled");
        const anyOpen = fetched.some(t => t.status !== "completed" && t.status !== "cancelled");

        if (allDone && project.status !== "completed" && project.status !== "cancelled") {
          await updateProjectStatus(id, "completed");
          setProject(p => p ? { ...p, status: "completed" } : p);
          toast.success("All tasks done — project marked as Completed.");
        } else if (anyOpen && project.status === "completed") {
          await updateProjectStatus(id, "in_progress");
          setProject(p => p ? { ...p, status: "in_progress" } : p);
        }
      }
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  }, [id, project]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleEdit        = (task: Task) => { setEditTask(task); setTaskModalOpen(true); };
  const handleModalClose  = () => { setTaskModalOpen(false); setEditTask(null); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTask(deleteTarget.id);
      toast.success("Task deleted");
      setDeleteTarget(null);
      loadTasks();
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived stats ─────────────────────────────────────────
  const doneTasks         = tasks.filter(t => t.status === "completed").length;
  const totalTasks        = tasks.length;
  const totalSourcePages  = tasks.reduce((s, t) => s + (t.source_pages ?? 0), 0);
  const totalTargetPages  = tasks.reduce((s, t) => s + (t.final_pages ?? 0), 0);
  const totalRevPages     = tasks.reduce((s, t) => s + (t.total_revision_pages ?? 0), 0);
  const totalOrigAmt      = tasks.reduce((s, t) => s + ((t.final_pages ?? 0) * (t.rate_per_page ?? 0)), 0);
  const totalRevAmt       = tasks.reduce((s, t) =>
    s + (t.task_revisions ?? []).reduce((rs, r) => rs + (r.revision_pages * (r.rate_per_page ?? 0)), 0), 0
  );

  return (
    <>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/projects")}
              className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={15} />
            </button>
            <div>
              {loadingProj ? (
                <div className="space-y-1.5">
                  <div className="h-5 w-48 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse" />
                </div>
              ) : project ? (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">{project.project_name}</h2>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5 font-mono">{project.project_code}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Project not found</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadTasks}
              title="Refresh tasks"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} className={loadingTasks ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => { setEditTask(null); setTaskModalOpen(true); }}
              className="h-9 px-4 flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={15} />
              Add Task
            </button>
          </div>
        </div>

        {/* ── Top row: two cards side by side ── */}
        {project && !loadingProj && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card 1 — Project Information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-slate-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Information</p>
              </div>
              <div className="divide-y divide-gray-100">
                <InfoRow icon={<Building2 size={13} className="text-violet-500" />} label="Client">
                  <span className="text-sm font-semibold text-violet-700">{project.clients?.company_name ?? "—"}</span>
                </InfoRow>
                <InfoRow icon={<User size={13} className="text-blue-500" />} label="Coordinator">
                  <span className="text-sm font-medium text-gray-800">{project.employees?.full_name ?? <span className="text-gray-400">—</span>}</span>
                </InfoRow>
                <InfoRow icon={<CalendarDays size={13} className="text-gray-400" />} label="Received">
                  <span className="text-sm font-medium text-gray-700">{fmt(project.received_date)}</span>
                </InfoRow>
                <InfoRow icon={<FileText size={13} className="text-gray-400" />} label="Source Pages">
                  <span className="text-sm font-medium text-gray-700">{project.source_file_pages ?? <span className="text-gray-400">—</span>}</span>
                </InfoRow>
                <InfoRow icon={<Globe size={13} className="text-sky-500" />} label="Source Lang">
                  <span className="text-sm font-medium text-gray-700">{project.languages?.language_name ?? <span className="text-gray-400">—</span>}</span>
                </InfoRow>
                <InfoRow icon={<Globe size={13} className="text-blue-500" />} label="Target Langs">
                  <div className="flex flex-wrap gap-1">
                    {(project.project_target_languages ?? []).length === 0 ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : (
                      (project.project_target_languages ?? []).map(t => (
                        <span key={t.language_id} className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-200">
                          {t.languages?.language_name}
                        </span>
                      ))
                    )}
                  </div>
                </InfoRow>
                {/* Notes */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <StickyNote size={13} className="text-amber-500" />
                    <p className="text-xs font-medium text-gray-400">Notes</p>
                  </div>
                  {project.project_notes ? (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{project.project_notes}</p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No notes added.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2 — Task Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-slate-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Task Summary</p>
              </div>
              <div className="p-4 space-y-3">

                {/* Task progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <CheckSquare size={13} className="text-emerald-500" />
                      <span className="text-xs font-medium text-gray-500">Tasks Completed</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">{doneTasks} / {totalTasks}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: totalTasks > 0 ? `${Math.round((doneTasks / totalTasks) * 100)}%` : "0%" }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {totalTasks > 0 ? `${Math.round((doneTasks / totalTasks) * 100)}% done` : "No tasks yet"}
                  </p>
                </div>

                {/* Page stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  <StatBox
                    label="Source Pages"
                    value={totalSourcePages}
                    color="sky"
                    icon={<FileText size={11} />}
                    hint="Input pages (source file)"
                  />
                  <StatBox
                    label="Target Pages"
                    value={totalTargetPages}
                    color="blue"
                    hint="Output pages (source × languages)"
                  />
                  <StatBox
                    label="Revision Pages"
                    value={totalRevPages}
                    color="amber"
                    icon={<RotateCcw size={11} />}
                  />
                  <StatBox
                    label="Total Amount"
                    value={`₹${(totalOrigAmt + totalRevAmt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                    color="emerald"
                  />
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Loading skeleton */}
        {loadingProj && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-52 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-52 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        )}

        {/* ── Full-width Task Table ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              {loadingTasks ? "Loading tasks…" : `${totalTasks} Task${totalTasks !== 1 ? "s" : ""}`}
            </p>
          </div>
          <TaskList
            tasks={tasks}
            loading={loadingTasks}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
            onRefresh={loadTasks}
            onAddTask={() => { setEditTask(null); setTaskModalOpen(true); }}
          />
        </div>

      </div>

      <TaskModal
        open={taskModalOpen}
        projectId={id}
        task={editTask}
        onClose={handleModalClose}
        onSuccess={loadTasks}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        projectName={deleteTarget?.task_types?.name ?? "this task"}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ── Info Row ─────────────────────────────────────────────────

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        {icon}
        <p className="text-xs font-medium text-gray-400">{label}</p>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── Stat Box ─────────────────────────────────────────────────

const STAT_COLORS: Record<string, string> = {
  sky:     "bg-sky-50 text-sky-700 border-sky-100",
  blue:    "bg-blue-50 text-blue-700 border-blue-100",
  amber:   "bg-amber-50 text-amber-700 border-amber-100",
  purple:  "bg-purple-50 text-purple-700 border-purple-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function StatBox({ label, value, color, icon, hint }: {
  label: string; value: string | number; color: string; icon?: React.ReactNode; hint?: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${STAT_COLORS[color]}`}>
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <p className="text-xs opacity-70">{label}</p>
      </div>
      <p className="text-base font-bold">{value}</p>
      {hint && <p className="text-[10px] opacity-50 mt-0.5">{hint}</p>}
    </div>
  );
}
