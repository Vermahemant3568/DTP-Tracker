"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban, ListTodo, FileText, Plus,
  RefreshCw, Clock, CheckCircle2, Loader2, TrendingUp,
  Building2, Truck, Layers, CalendarDays, Activity, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { fetchDashboardData, type DashboardData } from "@/services/dashboardService";
import ProjectModal from "@/components/projects/ProjectModal";

// ── Constants ─────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const CARD_ACCENTS = [
  { border: "border-blue-400",    soft: "bg-blue-50",    text: "text-blue-600",    num: "text-blue-700"    },
  { border: "border-violet-400",  soft: "bg-violet-50",  text: "text-violet-600",  num: "text-violet-700"  },
  { border: "border-emerald-400", soft: "bg-emerald-50", text: "text-emerald-600", num: "text-emerald-700" },
  { border: "border-rose-400",    soft: "bg-rose-50",    text: "text-rose-600",    num: "text-rose-700"    },
  { border: "border-amber-400",   soft: "bg-amber-50",   text: "text-amber-600",   num: "text-amber-700"   },
  { border: "border-cyan-400",    soft: "bg-cyan-50",    text: "text-cyan-600",    num: "text-cyan-700"    },
  { border: "border-pink-400",    soft: "bg-pink-50",    text: "text-pink-600",    num: "text-pink-700"    },
  { border: "border-indigo-400",  soft: "bg-indigo-50",  text: "text-indigo-600",  num: "text-indigo-700"  },
];

// ── Section label ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
    </div>
  );
}

// ── Filter select — wider with a label above ──────────────────

function FilterSelect({ value, onChange, children, width }: {
  value: string | number; onChange: (v: string) => void; children: React.ReactNode; width?: string;
}) {
  return (
    <div className={`relative ${width ?? ""}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-full pl-3.5 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer shadow-sm hover:border-blue-300 transition-colors"
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ── Summary gradient card ─────────────────────────────────────

function SummaryCard({ gradient, icon, label, value, sub }: {
  gradient: string; icon: React.ReactNode; label: string; value: number; sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 h-16 w-16 rounded-full bg-white/10" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold mt-1.5 tabular-nums">{value.toLocaleString()}</p>
          {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
        </div>
        <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Inhouse / Vendor split block ──────────────────────────────

function SplitBlock({ inhouse, vendor }: { inhouse: number; vendor: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {/* Inhouse */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Building2 size={12} className="text-blue-500 shrink-0" />
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Inhouse</span>
        </div>
        <p className="text-lg font-extrabold text-blue-700 tabular-nums leading-none">{inhouse.toLocaleString()}</p>
        <p className="text-[10px] text-blue-400 mt-0.5">pages</p>
      </div>
      {/* Vendor */}
      <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Truck size={12} className="text-violet-500 shrink-0" />
          <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Vendor</span>
        </div>
        <p className="text-lg font-extrabold text-violet-700 tabular-nums leading-none">{vendor.toLocaleString()}</p>
        <p className="text-[10px] text-violet-400 mt-0.5">pages</p>
      </div>
    </div>
  );
}

// ── Month card wrapper ────────────────────────────────────────

function MonthCard({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className={`bg-white rounded-2xl border-t-4 ${accent} shadow-sm hover:shadow-md transition-shadow duration-200 p-5`}>
      {children}
    </div>
  );
}

function CardHeader({ icon, label, iconBg }: { icon: React.ReactNode; label: string; iconBg: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
    </div>
  );
}

// ── Task status row ───────────────────────────────────────────

function StatusRow({ icon, label, count, bg }: {
  icon: React.ReactNode; label: string; count: number; bg: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-xs text-gray-500">
        <span className={`h-5 w-5 rounded-md flex items-center justify-center ${bg}`}>{icon}</span>
        {label}
      </span>
      <span className="text-xs font-bold text-gray-800 tabular-nums">{count}</span>
    </div>
  );
}

// ── Task type card ────────────────────────────────────────────

function TaskTypeCard({ name, totalPages, inhousePages, vendorPages, taskCount, accent }: {
  name: string; totalPages: number; inhousePages: number; vendorPages: number;
  taskCount: number; accent: typeof CARD_ACCENTS[0];
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${accent.border} shadow-sm hover:shadow-md transition-all duration-200 p-5`}>

      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={`h-8 w-8 rounded-xl ${accent.soft} flex items-center justify-center shrink-0`}>
          <Layers size={15} className={accent.text} />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${accent.soft} ${accent.text}`}>
          {taskCount} task{taskCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Name + total */}
      <p className="text-sm font-bold text-gray-800 truncate">{name}</p>
      <p className={`text-2xl font-extrabold tabular-nums mt-1 ${accent.num}`}>
        {totalPages.toLocaleString()}
      </p>
      <p className="text-[11px] text-gray-400 font-medium">total pages</p>

      {/* Divider */}
      <div className="my-3 h-px bg-gray-100" />

      {/* Inhouse / Vendor split */}
      {totalPages > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-2.5 py-2">
            <div className="flex items-center gap-1 mb-1">
              <Building2 size={11} className="text-blue-500 shrink-0" />
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Inhouse</span>
            </div>
            <p className="text-base font-extrabold text-blue-700 tabular-nums leading-none">{inhousePages.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-100 px-2.5 py-2">
            <div className="flex items-center gap-1 mb-1">
              <Truck size={11} className="text-violet-500 shrink-0" />
              <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">Vendor</span>
            </div>
            <p className="text-base font-extrabold text-violet-700 tabular-nums leading-none">{vendorPages.toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 italic">No pages yet</p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear]     = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchDashboardData(year, month));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const totalMonthTasks = data
    ? data.monthlyTasksPending + data.monthlyTasksInProgress + data.monthlyTasksCompleted
    : 0;

  return (
    <div className="space-y-7 pb-6">

      {/* ── 1. Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Activity size={13} className="text-blue-400" />
            Production overview &amp; tracker summary
          </p>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          {/* Filter group */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
            <CalendarDays size={16} className="text-gray-400 shrink-0" />
            <FilterSelect value={year} onChange={v => setYear(Number(v))} width="w-24">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </FilterSelect>
            <div className="w-px h-6 bg-gray-200" />
            <FilterSelect value={month} onChange={v => setMonth(Number(v))} width="w-36">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </FilterSelect>
          </div>

          {/* Add project */}
          <button
            onClick={() => setProjectModalOpen(true)}
            className="h-[52px] px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md shadow-blue-200 flex items-center gap-2"
          >
            <Plus size={15} />
            Add Project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="h-10 w-10 rounded-full border-[3px] border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      ) : data && (
        <>
          {/* ── 2. Overall Summary ── */}
          <section>
            <SectionLabel>Overall Tracker Summary</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                gradient="bg-gradient-to-br from-blue-600 to-blue-400"
                icon={<FolderKanban size={22} className="text-white" />}
                label="Total Projects" value={data.totalProjects} sub="All time"
              />
              <SummaryCard
                gradient="bg-gradient-to-br from-emerald-600 to-emerald-400"
                icon={<ListTodo size={22} className="text-white" />}
                label="Total Tasks" value={data.totalTasks} sub="Across all projects"
              />
              <SummaryCard
                gradient="bg-gradient-to-br from-violet-600 to-violet-400"
                icon={<FileText size={22} className="text-white" />}
                label="Total Production Pages" value={data.totalProductionPages} sub="Final pages delivered"
              />
            </div>
          </section>

          {/* ── 3. This Month ── */}
          <section>
            <SectionLabel>{MONTHS[month - 1]} {year}</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Pages */}
              <MonthCard accent="border-blue-500">
                <CardHeader icon={<TrendingUp size={17} className="text-blue-600" />} label="Pages This Month" iconBg="bg-blue-50" />
                <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{data.monthlyPages.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">total production pages</p>
                <SplitBlock inhouse={data.monthlyInhousePages} vendor={data.monthlyVendorPages} />
              </MonthCard>

              {/* Revisions */}
              <MonthCard accent="border-amber-500">
                <CardHeader icon={<RefreshCw size={17} className="text-amber-600" />} label="Revisions This Month" iconBg="bg-amber-50" />
                <div className="flex items-end gap-2.5">
                  <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{data.monthlyRevisionPages.toLocaleString()}</p>
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    {data.monthlyRevisionCount} rev{data.monthlyRevisionCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">total revision pages</p>
                <SplitBlock inhouse={data.monthlyRevisionInhousePages} vendor={data.monthlyRevisionVendorPages} />
              </MonthCard>

              {/* Tasks */}
              <MonthCard accent="border-emerald-500">
                <CardHeader icon={<Loader2 size={17} className="text-emerald-600" />} label="Tasks This Month" iconBg="bg-emerald-50" />
                <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{totalMonthTasks.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">tasks created</p>

                <div className="mt-4 divide-y divide-gray-50">
                  <StatusRow icon={<Clock size={10} className="text-amber-500" />}    label="Pending"     count={data.monthlyTasksPending}    bg="bg-amber-50" />
                  <StatusRow icon={<Loader2 size={10} className="text-blue-500" />}   label="In Progress" count={data.monthlyTasksInProgress}  bg="bg-blue-50" />
                  <StatusRow icon={<CheckCircle2 size={10} className="text-emerald-500" />} label="Completed" count={data.monthlyTasksCompleted} bg="bg-emerald-50" />
                </div>

                {totalMonthTasks > 0 && (
                  <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-gray-100 gap-0.5">
                    {data.monthlyTasksPending > 0 && (
                      <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(data.monthlyTasksPending / totalMonthTasks) * 100}%` }} />
                    )}
                    {data.monthlyTasksInProgress > 0 && (
                      <div className="bg-blue-400 transition-all duration-500" style={{ width: `${(data.monthlyTasksInProgress / totalMonthTasks) * 100}%` }} />
                    )}
                    {data.monthlyTasksCompleted > 0 && (
                      <div className="bg-emerald-400 transition-all duration-500" style={{ width: `${(data.monthlyTasksCompleted / totalMonthTasks) * 100}%` }} />
                    )}
                  </div>
                )}
              </MonthCard>

            </div>
          </section>

          {/* ── 4. Task Type Cards ── */}
          <section>
            <SectionLabel>By Task Type</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {data.taskTypeSummaries.map((tt, i) => (
                  <TaskTypeCard
                    key={tt.id}
                    accent={CARD_ACCENTS[i % CARD_ACCENTS.length]}
                    name={tt.name}
                    totalPages={tt.totalPages}
                    inhousePages={tt.inhousePages}
                    vendorPages={tt.vendorPages}
                    taskCount={tt.taskCount}
                  />
                ))}
              </div>
            </section>
        </>
      )}

      <ProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSuccess={() => router.push("/projects")}
      />
    </div>
  );
}
