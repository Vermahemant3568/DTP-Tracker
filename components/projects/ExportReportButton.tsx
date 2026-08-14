"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Loader2, ChevronDown, Calendar, FileSpreadsheet, X, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { fetchProjectsByMonth } from "@/services/projectService";
import type { Project } from "@/types/database";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_LABELS: Record<string, string> = {
  pending:     "Pending",
  in_progress: "In Progress",
  completed:   "Completed",
  on_hold:     "On Hold",
  cancelled:   "Cancelled",
};

type Preset = "this_month" | "last_month" | "last_3" | "last_6" | "custom";

interface MonthYear { month: number; year: number; }

function getPresetRange(preset: Preset, customFrom: MonthYear, customTo: MonthYear): MonthYear[] {
  const now = new Date();
  const cur = { month: now.getMonth() + 1, year: now.getFullYear() };

  function stepBack(base: MonthYear, steps: number): MonthYear {
    let { month, year } = base;
    for (let i = 0; i < steps; i++) {
      month--;
      if (month === 0) { month = 12; year--; }
    }
    return { month, year };
  }

  function range(from: MonthYear, to: MonthYear): MonthYear[] {
    const result: MonthYear[] = [];
    let cur = { ...from };
    while (cur.year < to.year || (cur.year === to.year && cur.month <= to.month)) {
      result.push({ ...cur });
      cur.month++;
      if (cur.month > 12) { cur.month = 1; cur.year++; }
    }
    return result;
  }

  if (preset === "this_month")  return [cur];
  if (preset === "last_month")  return [stepBack(cur, 1)];
  if (preset === "last_3")      return range(stepBack(cur, 2), cur);
  if (preset === "last_6")      return range(stepBack(cur, 5), cur);
  return range(customFrom, customTo);
}

function presetLabel(preset: Preset) {
  if (preset === "this_month") return "This Month";
  if (preset === "last_month") return "Last Month";
  if (preset === "last_3")     return "Last 3 Months";
  if (preset === "last_6")     return "Last 6 Months";
  return "Custom Range";
}

function buildRows(projects: Project[]) {
  const rows: Record<string, string | number>[] = [];

  for (const p of projects) {
    const tasks = (p as any).tasks as any[] | undefined;

    const taskRows = (!tasks || tasks.length === 0 ? [null] : tasks).map((t: any) => ({
      "Client Name":         p.clients?.company_name ?? "—",
      "Project Name":        p.project_name,
      "Project Coordinator": p.employees?.full_name ?? "—",
      "Source Language":     p.languages?.language_name ?? "—",
      "Target Languages":    (p.project_target_languages ?? [])
                               .map((tl: any) => tl.languages?.language_name)
                               .filter(Boolean).join(", ") || "—",
      "No. of Languages":    p.number_of_languages,
      "Source Pages":        p.source_file_pages ?? 0,
      "Task Type":           t?.task_types?.name ?? "—",
      "Work Type":           t?.work_type ?? "—",
      "Assigned To":         t?.assigned_name ?? "—",
      "Task Pages":          t?.final_pages ?? 0,
      "Notes":               p.project_notes ?? "",
    }));

    rows.push(...taskRows);
  }

  return rows;
}

const COL_WIDTHS = [22, 30, 22, 16, 30, 14, 13, 18, 12, 22, 11, 30];

export default function ExportReportButton() {
  const now = new Date();
  const [open,       setOpen]       = useState(false);
  const [preset,     setPreset]     = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState<MonthYear>({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [customTo,   setCustomTo]   = useState<MonthYear>({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [exporting,  setExporting]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  async function handleExport() {
    setExporting(true);
    try {
      const months = getPresetRange(preset, customFrom, customTo);
      const allProjects: Project[] = [];

      for (const { month, year } of months) {
        const rows = await fetchProjectsByMonth(year, month);
        allProjects.push(...rows);
      }

      // Deduplicate by project id (a project could span months if date range overlaps)
      const seen = new Set<string>();
      const unique = allProjects.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

      if (unique.length === 0) {
        toast.info("No projects found for the selected period");
        return;
      }

      const wb = XLSX.utils.book_new();

      if (months.length === 1) {
        // Single month → one sheet
        const ws = XLSX.utils.json_to_sheet(buildRows(unique));
        ws["!cols"] = COL_WIDTHS.map(wch => ({ wch }));
        XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[months[0].month - 1]} ${months[0].year}`);
      } else {
        // Multi-month → one sheet per month + a combined summary sheet
        for (const { month, year } of months) {
          const monthProjects = unique.filter(p => {
            const m = parseInt(p.received_date.slice(5, 7));
            const y = parseInt(p.received_date.slice(0, 4));
            return m === month && y === year;
          });
          const ws = XLSX.utils.json_to_sheet(buildRows(monthProjects));
          ws["!cols"] = COL_WIDTHS.map(wch => ({ wch }));
          XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[month - 1].slice(0, 3)} ${year}`);
        }
        // Summary sheet
        const summaryWs = XLSX.utils.json_to_sheet(buildRows(unique));
        summaryWs["!cols"] = COL_WIDTHS.map(wch => ({ wch }));
        XLSX.utils.book_append_sheet(wb, summaryWs, "All Projects");
      }

      const label = months.length === 1
        ? `${MONTHS[months[0].month - 1]}_${months[0].year}`
        : `${MONTHS[months[0].month - 1]}_${months[0].year}_to_${MONTHS[months[months.length - 1].month - 1]}_${months[months.length - 1].year}`;

      XLSX.writeFile(wb, `DTP_Report_${label}.xlsx`);
      toast.success(`Exported ${unique.length} project${unique.length !== 1 ? "s" : ""} across ${months.length} month${months.length !== 1 ? "s" : ""}`);
      setOpen(false);
    } catch {
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  }

  const presets: { key: Preset; label: string; desc: string }[] = [
    { key: "this_month", label: "This Month",     desc: `${MONTHS[now.getMonth()]} ${now.getFullYear()}` },
    { key: "last_month", label: "Last Month",     desc: (() => { const d = new Date(now.getFullYear(), now.getMonth() - 1); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; })() },
    { key: "last_3",     label: "Last 3 Months",  desc: "Rolling 3-month window" },
    { key: "last_6",     label: "Last 6 Months",  desc: "Rolling 6-month window" },
    { key: "custom",     label: "Custom Range",   desc: "Pick start & end month" },
  ];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="h-[52px] px-5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-sm font-semibold hover:from-emerald-100 hover:to-teal-100 transition-all shadow-sm flex items-center gap-2.5"
      >
        <FileSpreadsheet size={16} className="text-emerald-600" />
        Export Report
        <ChevronDown size={13} className={`text-emerald-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 overflow-hidden">

          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileSpreadsheet size={14} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Export Excel Report</p>
                <p className="text-[10px] text-gray-400">Select a date range to export</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="h-6 w-6 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              <X size={13} />
            </button>
          </div>

          {/* Preset options */}
          <div className="p-3 space-y-1">
            {presets.map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                  preset === p.key
                    ? "bg-emerald-50 border border-emerald-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <div>
                  <p className={`text-sm font-semibold ${preset === p.key ? "text-emerald-700" : "text-gray-700"}`}>{p.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.desc}</p>
                </div>
                {preset === p.key && (
                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom range picker */}
          {preset === "custom" && (
            <div className="mx-3 mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <Calendar size={11} />
                Custom Range
              </div>
              {/* From */}
              <div>
                <p className="text-[11px] text-gray-400 mb-1.5 font-medium">From</p>
                <div className="flex gap-2">
                  <select
                    value={customFrom.month}
                    onChange={e => setCustomFrom(f => ({ ...f, month: Number(e.target.value) }))}
                    className="flex-1 h-8 pl-2 pr-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 cursor-pointer"
                  >
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                  <select
                    value={customFrom.year}
                    onChange={e => setCustomFrom(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-20 h-8 pl-2 pr-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 cursor-pointer"
                  >
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {/* To */}
              <div>
                <p className="text-[11px] text-gray-400 mb-1.5 font-medium">To</p>
                <div className="flex gap-2">
                  <select
                    value={customTo.month}
                    onChange={e => setCustomTo(f => ({ ...f, month: Number(e.target.value) }))}
                    className="flex-1 h-8 pl-2 pr-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 cursor-pointer"
                  >
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                  <select
                    value={customTo.year}
                    onChange={e => setCustomTo(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-20 h-8 pl-2 pr-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 cursor-pointer"
                  >
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Export button */}
          <div className="px-3 pb-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-600 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exporting
                ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
                : <><Download size={14} /> Download {presetLabel(preset)}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
