"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, RefreshCw, Pencil, Trash2, Globe, Search } from "lucide-react";
import { toast } from "sonner";

import { fetchAllLanguages, deleteLanguage } from "@/services/languageService";
import type { Language } from "@/types/database";
import LanguageModal from "@/components/languages/LanguageModal";
import DeleteLanguageDialog from "@/components/languages/DeleteLanguageDialog";

// ── Config ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
};

const TYPE_STYLES: Record<string, string> = {
  source: "bg-blue-50 text-blue-700",
  target: "bg-violet-50 text-violet-700",
  both:   "bg-teal-50 text-teal-700",
};

const TYPE_LABELS: Record<string, string> = {
  source: "Source",
  target: "Target",
  both:   "Source & Target",
};

type FilterType   = "all" | "source" | "target" | "both";
type FilterStatus = "all" | "active" | "inactive";

// ── Component ─────────────────────────────────────────────────

export default function LanguagesPage() {
  const [languages,    setLanguages]    = useState<Language[]>([]);
  const [fetching,     setFetching]     = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editLanguage, setEditLanguage] = useState<Language | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Language | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const loadLanguages = useCallback(async () => {
    setFetching(true);
    try {
      setLanguages(await fetchAllLanguages());
    } catch {
      toast.error("Failed to load languages");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadLanguages(); }, [loadLanguages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return languages.filter((l) => {
      const matchesSearch  = l.language_name.toLowerCase().includes(q) || (l.language_code ?? "").toLowerCase().includes(q);
      const matchesType    = filterType === "all" || l.language_type === filterType;
      const matchesStatus  = filterStatus === "all" || l.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [languages, search, filterType, filterStatus]);

  const counts = useMemo(() => ({
    source: languages.filter(l => l.language_type === "source").length,
    target: languages.filter(l => l.language_type === "target").length,
    both:   languages.filter(l => l.language_type === "both").length,
  }), [languages]);

  const handleEdit = (lang: Language) => { setEditLanguage(lang); setModalOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLanguage(deleteTarget.id);
      toast.success(`"${deleteTarget.language_name}" deleted`);
      setDeleteTarget(null);
      loadLanguages();
    } catch {
      toast.error("Failed to delete. This language may be in use by projects or tasks.");
    } finally {
      setDeleting(false);
    }
  };

  const handleModalClose = () => { setModalOpen(false); setEditLanguage(null); };

  return (
    <>
      <div className="space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Languages</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {fetching ? "Loading…" : `${languages.length} language${languages.length !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadLanguages} title="Refresh"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => { setEditLanguage(null); setModalOpen(true); }}
              className="h-9 px-4 flex items-center gap-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <Plus size={16} />
              Add Language
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",          value: languages.length, color: "text-gray-900",    bg: "bg-white",       border: "border-gray-200" },
            { label: "Source Only",    value: counts.source,    color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-100" },
            { label: "Target Only",    value: counts.target,    color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-100" },
            { label: "Source & Target",value: counts.both,      color: "text-teal-700",    bg: "bg-teal-50",     border: "border-teal-100" },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl border ${stat.border} px-4 py-3`}>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or code…"
              className="h-9 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder-gray-400"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {([
              { value: "all",    label: "All Types" },
              { value: "source", label: "Source" },
              { value: "target", label: "Target" },
              { value: "both",   label: "Both" },
            ] as { value: FilterType; label: string }[]).map(opt => (
              <button key={opt.value} onClick={() => setFilterType(opt.value)}
                className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                  filterType === opt.value ? "bg-teal-600 text-white" : "text-gray-500 hover:text-gray-700"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(["all", "active", "inactive"] as FilterStatus[]).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`h-7 px-3 rounded-md text-xs font-medium transition-colors capitalize ${
                  filterStatus === s ? "bg-teal-600 text-white" : "text-gray-500 hover:text-gray-700"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 whitespace-nowrap">#</th>
                  <th className="px-4 py-3 whitespace-nowrap">Language Name</th>
                  <th className="px-4 py-3 whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Globe size={32} className="opacity-30" />
                        <p className="text-sm font-medium">
                          {search || filterType !== "all" || filterStatus !== "all"
                            ? "No languages match your filters."
                            : "No languages yet. Click \"Add Language\" to get started."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((lang, idx) => (
                    <tr key={lang.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-gray-400 tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-medium text-gray-900">{lang.language_name}</td>
                      <td className="px-4 py-3.5">
                        {lang.language_code ? (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                            {lang.language_code}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[lang.language_type]}`}>
                          {TYPE_LABELS[lang.language_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[lang.status]}`}>
                          {lang.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(lang)} title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(lang)} title="Delete"
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
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
              <p className="text-xs text-gray-400">
                Showing {filtered.length} of {languages.length} language{languages.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      <LanguageModal
        open={modalOpen}
        language={editLanguage}
        onClose={handleModalClose}
        onSuccess={loadLanguages}
      />

      <DeleteLanguageDialog
        open={!!deleteTarget}
        languageName={deleteTarget?.language_name ?? ""}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
