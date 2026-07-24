"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw, BadgeCheck, RotateCcw, ExternalLink, Search, X } from "lucide-react";
import { toast } from "sonner";

import { fetchJobs, reopenJob } from "@/services/jobService";
import type { Job } from "@/types/database";
import JobCodeModal from "@/components/jobs/JobCodeModal";

// ── Config ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};
const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  completed: "Completed",
};
const WORK_STYLES: Record<string, string> = {
  Inhouse: "bg-violet-50 text-violet-700",
  Vendor:  "bg-orange-50 text-orange-700",
};

// ── Page ──────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs,      setJobs]      = useState<Job[]>([]);
  const [fetching,  setFetching]  = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "all">("pending");
  const [modalJob,  setModalJob]  = useState<Job | null>(null);
  const [reopening, setReopening] = useState<string | null>(null);

  // Filters
  const [search,      setSearch]      = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterCoordinator, setFilterCoordinator] = useState("");
  const [filterWorkType, setFilterWorkType] = useState("");

  const loadJobs = useCallback(async () => {
    setFetching(true);
    try { setJobs(await fetchJobs()); }
    catch { toast.error("Failed to load jobs"); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleReopen = async (job: Job) => {
    if (!confirm(`Reopen job for "${job.tasks?.task_types?.name}"? This will clear the job code.`)) return;
    setReopening(job.id);
    try {
      await reopenJob(job.id);
      toast.success("Job reopened");
      loadJobs();
    } catch {
      toast.error("Failed to reopen job");
    } finally {
      setReopening(null);
    }
  };

  // ── Unique filter options ─────────────────────────────────
  const clientOptions = useMemo(() =>
    [...new Set(jobs.map(j => j.tasks?.projects?.clients?.company_name).filter(Boolean))] as string[],
    [jobs]);

  const projectOptions = useMemo(() =>
    [...new Set(jobs.map(j => j.tasks?.projects?.project_name).filter(Boolean))] as string[],
    [jobs]);

  const coordinatorOptions = useMemo(() =>
    [...new Set(jobs.map(j => j.coordinator_name).filter(v => v && v !== "—"))] as string[],
    [jobs]);

  // ── Derived ───────────────────────────────────────────────
  const tabFiltered = jobs.filter((j) => activeTab === "all" ? true : j.status === activeTab);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabFiltered.filter((j) => {
      const task    = j.tasks;
      const project = task?.projects;

      if (filterClient && project?.clients?.company_name !== filterClient) return false;
      if (filterProject && project?.project_name !== filterProject) return false;
      if (filterCoordinator && j.coordinator_name !== filterCoordinator) return false;
      if (filterWorkType && task?.work_type !== filterWorkType) return false;

      if (q) {
        const haystack = [
          j.job_code,
          project?.project_name,
          project?.project_code,
          project?.clients?.company_name,
          task?.task_types?.name,
          j.assigned_name,
          j.coordinator_name,
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [tabFiltered, search, filterClient, filterProject, filterCoordinator, filterWorkType]);

  const pendingCount   = jobs.filter((j) => j.status === "pending").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;

  const hasFilters = search || filterClient || filterProject || filterCoordinator || filterWorkType;
  const clearFilters = () => {
    setSearch(""); setFilterClient(""); setFilterProject("");
    setFilterCoordinator(""); setFilterWorkType("");
  };

  return (
    <>
      <div className="space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Jobs</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Paid tasks awaiting or received job codes from coordinators
            </p>
          </div>
          <button onClick={loadJobs} title="Refresh"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Summary cards */}
        {!fetching && (
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Total Jobs"  value={jobs.length}      color="blue"    />
            <SummaryCard label="Pending"     value={pendingCount}     color="amber"   />
            <SummaryCard label="Completed"   value={completedCount}   color="emerald" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {([
            { key: "pending",   label: `Pending (${pendingCount})`     },
            { key: "completed", label: `Completed (${completedCount})` },
            { key: "all",       label: `All (${jobs.length})`          },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs…"
              className="h-9 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder-gray-400" />
          </div>

          {/* Client */}
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
            <option value="">All Clients</option>
            {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Project */}
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
            <option value="">All Projects</option>
            {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Coordinator */}
          <select value={filterCoordinator} onChange={e => setFilterCoordinator(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
            <option value="">All Coordinators</option>
            {coordinatorOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Work Type */}
          <select value={filterWorkType} onChange={e => setFilterWorkType(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
            <option value="">All Work Types</option>
            <option value="Inhouse">Inhouse</option>
            <option value="Vendor">Vendor</option>
          </select>

          {/* Clear */}
          {hasFilters && (
            <button onClick={clearFilters}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <X size={13} /> Clear
            </button>
          )}

          {hasFilters && (
            <span className="text-xs text-gray-400 ml-1">
              {filtered.length} of {tabFiltered.length} shown
            </span>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 whitespace-nowrap">#</th>
                  <th className="px-4 py-3 whitespace-nowrap">Job Code</th>
                  <th className="px-4 py-3 whitespace-nowrap">Project</th>
                  <th className="px-4 py-3 whitespace-nowrap">Client</th>
                  <th className="px-4 py-3 whitespace-nowrap">Coordinator</th>
                  <th className="px-4 py-3 whitespace-nowrap">Task Type</th>
                  <th className="px-4 py-3 whitespace-nowrap">Assigned To</th>
                  <th className="px-4 py-3 whitespace-nowrap">Work Type</th>
                  <th className="px-4 py-3 whitespace-nowrap">Languages</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Pages</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Rate</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Amount</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Created</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fetching ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 15 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-12 text-center text-sm text-gray-400">
                      {hasFilters
                        ? "No jobs match your filters."
                        : activeTab === "pending"
                          ? "No pending jobs. Mark tasks as Paid to generate jobs."
                          : "No completed jobs yet."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((job, idx) => {
                    const task    = job.tasks;
                    const project = task?.projects;
                    const amount  = task?.final_pages && task?.rate_per_page
                      ? task.final_pages * task.rate_per_page
                      : null;
                    const langs   = task?.task_languages ?? [];

                    return (
                      <tr key={job.id} className={`hover:bg-gray-50 transition-colors ${job.status === "completed" ? "opacity-75" : ""}`}>
                        <td className="px-4 py-3.5 text-gray-400 text-xs">{idx + 1}</td>

                        {/* Job Code */}
                        <td className="px-4 py-3.5">
                          {job.job_code ? (
                            <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              {job.job_code}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Awaiting code…</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-medium text-gray-900 whitespace-nowrap">{project?.project_name ?? "—"}</p>
                            <p className="text-xs text-gray-400 font-mono">{project?.project_code ?? ""}</p>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {project?.clients?.company_name ?? "—"}
                        </td>

                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {job.coordinator_name ?? "—"}
                        </td>

                        <td className="px-4 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                          {task?.task_types?.name ?? "—"}
                        </td>

                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {job.assigned_name ?? "—"}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {task?.work_type ? (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${WORK_STYLES[task.work_type]}`}>
                              {task.work_type}
                            </span>
                          ) : "—"}
                        </td>

                        <td className="px-4 py-3.5">
                          {langs.length === 0 ? <span className="text-gray-400">—</span> : (
                            <div className="flex flex-wrap gap-1">
                              {langs.slice(0, 2).map((tl) => (
                                <span key={tl.language_id} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 whitespace-nowrap">
                                  {tl.languages?.language_name}
                                </span>
                              ))}
                              {langs.length > 2 && (
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">+{langs.length - 2}</span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right text-gray-900 font-medium">{task?.final_pages ?? "—"}</td>
                        <td className="px-4 py-3.5 text-right text-gray-600">{task?.rate_per_page ? `₹${task.rate_per_page}` : "—"}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                          {amount ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}>
                            {STATUS_LABELS[job.status]}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(job.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {task?.deliverable_link && (
                              <a href={task.deliverable_link} target="_blank" rel="noopener noreferrer" title="View deliverable"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                <ExternalLink size={13} />
                              </a>
                            )}
                            {job.status === "pending" ? (
                              <button onClick={() => setModalJob(job)} title="Enter job code"
                                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap">
                                <BadgeCheck size={13} />
                                Enter Code
                              </button>
                            ) : (
                              <button onClick={() => handleReopen(job)} disabled={reopening === job.id} title="Reopen job"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors disabled:opacity-50">
                                <RotateCcw size={13} className={reopening === job.id ? "animate-spin" : ""} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <JobCodeModal
        open={!!modalJob}
        job={modalJob}
        onClose={() => setModalJob(null)}
        onSuccess={loadJobs}
      />
    </>
  );
}

// ── Summary Card ──────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: number; color: "blue" | "amber" | "emerald" }) {
  const colors = {
    blue:    "bg-blue-50 border-blue-100 text-blue-700",
    amber:   "bg-amber-50 border-amber-100 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[color]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
    </div>
  );
}
