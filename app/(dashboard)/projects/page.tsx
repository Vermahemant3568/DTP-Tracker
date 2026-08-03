"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Pencil, Trash2, Plus, RefreshCw, Eye, Search,
  FolderKanban, Clock, Loader2, CheckCircle2, PauseCircle,
  X, ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { fetchProjects, deleteProject } from "@/services/projectService";
import type { Project } from "@/types/database";
import ProjectModal from "@/components/projects/ProjectModal";
import DeleteConfirmDialog from "@/components/projects/DeleteConfirmDialog";

// ── Constants ─────────────────────────────────────────────────

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

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Helpers ───────────────────────────────────────────────────

function fmt(date: string) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d} ${MONTHS[parseInt(m) - 1]?.slice(0, 3)} ${y}`;
}

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, loading }: {
  label: string; value: number; icon: React.ElementType; color: string; loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        {loading
          ? <div className="h-5 w-8 rounded bg-gray-100 animate-pulse mt-0.5" />
          : <p className="text-lg font-semibold text-gray-900 leading-tight">{value}</p>}
      </div>
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────

function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  const active = value !== "all" && value !== "";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`h-9 pl-3 pr-7 text-xs rounded-lg border appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition cursor-pointer font-medium ${
          active
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-gray-600"
        }`}
      >
        {children}
      </select>
      <ChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${active ? "text-blue-500" : "text-gray-400"}`} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  search:      "",
  status:      "all",
  client:      "all",
  coordinator: "all",
  month:       "all",
};

type Filters = typeof EMPTY_FILTERS;

export default function ProjectsPage() {
  const router = useRouter();
  const [projects,     setProjects]     = useState<Project[]>([]);
  const [fetching,     setFetching]     = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editProject,  setEditProject]  = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const set = (key: keyof Filters, val: string) =>
    setFilters(f => ({ ...f, [key]: val }));

  const clearAll = () => setFilters(EMPTY_FILTERS);

  const loadProjects = useCallback(async () => {
    setFetching(true);
    try { setProjects(await fetchProjects()); }
    catch { toast.error("Failed to load projects"); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // ── Derived options ────────────────────────────────────────

  const clientOptions = useMemo(() => {
    const seen = new Map<string, string>();
    projects.forEach(p => { if (p.clients) seen.set(p.clients.id, p.clients.company_name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  const coordinatorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    projects.forEach(p => { if (p.employees) seen.set(p.employees.id, p.employees.full_name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  // ── Stats (always from full list) ─────────────────────────

  const stats = useMemo(() => ({
    total:       projects.length,
    pending:     projects.filter(p => p.status === "pending").length,
    in_progress: projects.filter(p => p.status === "in_progress").length,
    completed:   projects.filter(p => p.status === "completed").length,
    other:       projects.filter(p => p.status === "on_hold" || p.status === "cancelled").length,
  }), [projects]);

  // ── Filtered list ─────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return projects.filter(p => {
      if (filters.status !== "all" && p.status !== filters.status) return false;
      if (filters.client !== "all" && p.clients?.id !== filters.client) return false;
      if (filters.coordinator !== "all" && p.employees?.id !== filters.coordinator) return false;
      if (filters.month !== "all" && p.received_date) {
        const m = String(parseInt(filters.month)).padStart(2, "0");
        if (p.received_date.slice(5, 7) !== m) return false;
      }
      if (q && !p.project_name.toLowerCase().includes(q) && !p.project_code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, filters]);

  const hasFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.client !== "all" ||
    filters.coordinator !== "all" ||
    filters.month !== "all";

  const handleEdit   = (p: Project) => { setEditProject(p); setModalOpen(true); };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      toast.success("Project deleted");
      setDeleteTarget(null);
      loadProjects();
    } catch { toast.error("Failed to delete project"); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {fetching ? "Loading…" : `${filtered.length} of ${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadProjects} title="Refresh"
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">
              <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
            </button>
            <button onClick={() => { setEditProject(null); setModalOpen(true); }}
              className="h-8 px-3.5 flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus size={15} /> New Project
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total"              value={stats.total}       icon={FolderKanban} color="bg-blue-50 text-blue-600"       loading={fetching} />
          <StatCard label="Pending"            value={stats.pending}     icon={Clock}        color="bg-amber-50 text-amber-600"     loading={fetching} />
          <StatCard label="In Progress"        value={stats.in_progress} icon={Loader2}      color="bg-indigo-50 text-indigo-600"   loading={fetching} />
          <StatCard label="Completed"          value={stats.completed}   icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" loading={fetching} />
          <StatCard label="On Hold/Cancelled"  value={stats.other}       icon={PauseCircle}  color="bg-gray-100 text-gray-500"      loading={fetching} />
        </div>

        {/* Filter bar — single row */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-2.5">

          {/* Search */}
          <div className="relative min-w-[200px] flex-[3]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name or code…"
              value={filters.search}
              onChange={e => set("search", e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>

          {/* Status */}
          <FilterSelect value={filters.status} onChange={v => set("status", v)}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </FilterSelect>

          {/* Client */}
          <FilterSelect value={filters.client} onChange={v => set("client", v)}>
            <option value="all">All Clients</option>
            {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>

          {/* Coordinator */}
          <FilterSelect value={filters.coordinator} onChange={v => set("coordinator", v)}>
            <option value="all">All Coordinators</option>
            {coordinatorOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>

          {/* Month */}
          <FilterSelect value={filters.month} onChange={v => set("month", v)}>
            <option value="all">All Months</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
          </FilterSelect>

          {/* Clear */}
          {hasFilters && (
            <button onClick={clearAll}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-500 hover:bg-red-100 transition-colors shrink-0 font-medium">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 whitespace-nowrap">Code</th>
                  <th className="px-5 py-3 whitespace-nowrap">Project Name</th>
                  <th className="px-5 py-3 whitespace-nowrap">Client</th>
                  <th className="px-5 py-3 whitespace-nowrap">Coordinator</th>
                  <th className="px-5 py-3 whitespace-nowrap">Source</th>
                  <th className="px-5 py-3 whitespace-nowrap">Target Langs</th>
                  <th className="px-5 py-3 whitespace-nowrap">Src Pages</th>
                  <th className="px-5 py-3 whitespace-nowrap">Task Pages</th>
                  <th className="px-5 py-3 whitespace-nowrap">Received</th>
                  <th className="px-5 py-3 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-3.5 rounded bg-gray-100 animate-pulse" style={{ width: `${60 + (j * 13) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <FolderKanban size={32} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-sm text-gray-400">
                        {hasFilters ? "No projects match your filters." : "No projects yet. Click \"New Project\" to get started."}
                      </p>
                      {hasFilters && (
                        <button onClick={clearAll} className="mt-2 text-xs text-blue-500 hover:underline">
                          Clear all filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((project, idx) => {
                    const targetLangs = project.project_target_languages ?? [];
                    const rowBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50/60";
                    return (
                      <tr
                        key={project.id}
                        className={`${rowBg} hover:bg-blue-50/40 transition-colors cursor-pointer group border-b border-gray-100 last:border-0`}
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <td className="px-5 py-3.5 text-xs text-indigo-400 font-mono font-semibold whitespace-nowrap">
                          {project.project_code}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-gray-800 max-w-[200px] truncate">
                          {project.project_name}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full ring-1 ring-violet-200">
                            {project.clients?.company_name ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap text-xs">
                          {project.employees?.full_name ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                          {project.languages?.language_name ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {targetLangs.length === 0 ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {targetLangs.slice(0, 2).map(t => (
                                <span key={t.language_id}
                                  className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-200 whitespace-nowrap">
                                  {t.languages?.language_name}
                                </span>
                              ))}
                              {targetLangs.length > 2 && (
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                  +{targetLangs.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 text-xs font-medium">
                          {project.source_file_pages
                            ? <span className="bg-gray-100 px-2 py-0.5 rounded-md">{project.source_file_pages}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium">
                          {(project.total_task_pages ?? 0) > 0
                            ? <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md ring-1 ring-indigo-200">{project.total_task_pages}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">{fmt(project.received_date)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[project.status]}`}>
                            {STATUS_LABELS[project.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => router.push(`/projects/${project.id}`)} title="View"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                              <Eye size={13} />
                            </button>
                            <button onClick={() => handleEdit(project)} title="Edit"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeleteTarget(project)} title="Delete"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!fetching && filtered.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-100 bg-slate-50 text-xs text-gray-400">
              Showing {filtered.length} of {projects.length} projects
            </div>
          )}
        </div>
      </div>

      <ProjectModal
        open={modalOpen}
        project={editProject}
        onClose={() => { setModalOpen(false); setEditProject(null); }}
        onSuccess={loadProjects}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        projectName={deleteTarget?.project_name ?? ""}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
