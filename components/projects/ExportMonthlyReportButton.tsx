"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { fetchProjectsByMonth } from "@/services/projectService";

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

export default function ExportMonthlyReportButton() {
  const now = new Date();
  const [month,     setMonth]     = useState(now.getMonth() + 1);
  const [year,      setYear]      = useState(now.getFullYear());
  const [exporting, setExporting] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  async function handleExport() {
    setExporting(true);
    try {
      const projects = await fetchProjectsByMonth(year, month);

      if (projects.length === 0) {
        toast.info(`No projects found for ${MONTHS[month - 1]} ${year}`);
        return;
      }

      const rows = projects.map(p => ({
        "Project Code":        p.project_code,
        "Client Name":         p.clients?.company_name ?? "—",
        "Project Name":        p.project_name,
        "Project Coordinator": p.employees?.full_name ?? "—",
        "Source Language":     p.languages?.language_name ?? "—",
        "Target Languages":    (p.project_target_languages ?? [])
                                 .map(t => t.languages?.language_name)
                                 .filter(Boolean)
                                 .join(", ") || "—",
        "No. of Languages":    p.number_of_languages,
        "Source Pages":        p.source_file_pages ?? 0,
        "Task Pages":          p.total_task_pages ?? 0,
        "Received Date":       p.received_date,
        "Status":              STATUS_LABELS[p.status] ?? p.status,
        "Notes":               p.project_notes ?? "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);

      // Column widths
      ws["!cols"] = [
        { wch: 14 }, // Project Code
        { wch: 22 }, // Client Name
        { wch: 30 }, // Project Name
        { wch: 22 }, // Coordinator
        { wch: 16 }, // Source Language
        { wch: 30 }, // Target Languages
        { wch: 16 }, // No. of Languages
        { wch: 13 }, // Source Pages
        { wch: 11 }, // Task Pages
        { wch: 14 }, // Received Date
        { wch: 13 }, // Status
        { wch: 30 }, // Notes
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[month - 1]} ${year}`);
      XLSX.writeFile(wb, `DTP_Report_${MONTHS[month - 1]}_${year}.xlsx`);
      toast.success(`Report exported: ${projects.length} project${projects.length !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={month}
        onChange={e => setMonth(Number(e.target.value))}
        className="h-8 pl-2 pr-6 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition cursor-pointer"
      >
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={e => setYear(Number(e.target.value))}
        className="h-8 pl-2 pr-6 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition cursor-pointer"
      >
        {yearOptions.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {exporting
          ? <Loader2 size={13} className="animate-spin" />
          : <Download size={13} />}
        {exporting ? "Exporting…" : "Monthly Report"}
      </button>
    </div>
  );
}
