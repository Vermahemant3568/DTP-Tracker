"use client";

import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { fetchAllEmployees, deleteEmployee } from "@/services/employeeService";
import { fetchAllVendors, deleteVendor } from "@/services/vendorService";
import type { Employee, Vendor } from "@/types/database";
import EmployeeModal from "@/components/team/EmployeeModal";
import VendorModal from "@/components/team/VendorModal";
import DeleteTeamDialog from "@/components/team/DeleteTeamDialog";

// ── Constants ─────────────────────────────────────────────────

type Tab = "members" | "vendors";

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
};

const ROLE_STYLES: Record<string, string> = {
  coordinator: "bg-blue-50 text-blue-700",
  dtp_team:    "bg-purple-50 text-purple-700",
  custom:      "bg-gray-100 text-gray-600",
};

const ROLE_LABELS: Record<string, string> = {
  coordinator: "Coordinator",
  dtp_team:    "DTP Team",
  custom:      "Custom",
};

// ── Page ──────────────────────────────────────────────────────

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>("members");

  // ── Team Members state ────────────────────────────────────
  const [employees,     setEmployees]     = useState<Employee[]>([]);
  const [empFetching,   setEmpFetching]   = useState(true);
  const [empModal,      setEmpModal]      = useState(false);
  const [editEmployee,  setEditEmployee]  = useState<Employee | null>(null);
  const [deleteEmp,     setDeleteEmp]     = useState<Employee | null>(null);
  const [deletingEmp,   setDeletingEmp]   = useState(false);

  // ── Vendors state ─────────────────────────────────────────
  const [vendors,       setVendors]       = useState<Vendor[]>([]);
  const [vndFetching,   setVndFetching]   = useState(true);
  const [vndModal,      setVndModal]      = useState(false);
  const [editVendor,    setEditVendor]    = useState<Vendor | null>(null);
  const [deleteVnd,     setDeleteVnd]     = useState<Vendor | null>(null);
  const [deletingVnd,   setDeletingVnd]   = useState(false);

  // ── Loaders ───────────────────────────────────────────────

  const loadEmployees = useCallback(async () => {
    setEmpFetching(true);
    try { setEmployees(await fetchAllEmployees()); }
    catch { toast.error("Failed to load team members"); }
    finally { setEmpFetching(false); }
  }, []);

  const loadVendors = useCallback(async () => {
    setVndFetching(true);
    try { setVendors(await fetchAllVendors()); }
    catch { toast.error("Failed to load vendors"); }
    finally { setVndFetching(false); }
  }, []);

  useEffect(() => { loadEmployees(); loadVendors(); }, [loadEmployees, loadVendors]);

  // ── Handlers ──────────────────────────────────────────────

  const handleDeleteEmployee = async () => {
    if (!deleteEmp) return;
    setDeletingEmp(true);
    try {
      await deleteEmployee(deleteEmp.id);
      toast.success("Team member deleted");
      setDeleteEmp(null);
      loadEmployees();
    } catch {
      toast.error("Failed to delete. Member may be linked to projects.");
    } finally {
      setDeletingEmp(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!deleteVnd) return;
    setDeletingVnd(true);
    try {
      await deleteVendor(deleteVnd.id);
      toast.success("Vendor deleted");
      setDeleteVnd(null);
      loadVendors();
    } catch {
      toast.error("Failed to delete. Vendor may be linked to tasks.");
    } finally {
      setDeletingVnd(false);
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Team & Vendors</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage inhouse team members and external vendors
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "members" ? (
              <>
                <button
                  onClick={loadEmployees}
                  title="Refresh"
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={15} className={empFetching ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => { setEditEmployee(null); setEmpModal(true); }}
                  className="h-9 px-4 flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} /> Add Member
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={loadVendors}
                  title="Refresh"
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={15} className={vndFetching ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => { setEditVendor(null); setVndModal(true); }}
                  className="h-9 px-4 flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} /> Add Vendor
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {(["members", "vendors"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "members"
                ? `Team Members${empFetching ? "" : ` (${employees.length})`}`
                : `Vendors${vndFetching ? "" : ` (${vendors.length})`}`}
            </button>
          ))}
        </div>

        {/* ── Team Members Tab ── */}
        {tab === "members" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 whitespace-nowrap">Code</th>
                    <th className="px-4 py-3 whitespace-nowrap">Full Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Designation</th>
                    <th className="px-4 py-3 whitespace-nowrap">Role</th>
                    <th className="px-4 py-3 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 whitespace-nowrap">Phone</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {empFetching ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="h-4 rounded bg-gray-100 animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                        No team members found. Click "Add Member" to get started.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5 text-xs text-gray-400 font-mono whitespace-nowrap">
                          {emp.employee_code}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                          {emp.full_name}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {emp.designation ?? "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[emp.role]}`}>
                            {emp.role === "custom" && emp.designation ? emp.designation : ROLE_LABELS[emp.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {emp.email ? (
                            <a href={`mailto:${emp.email}`} className="text-blue-600 hover:underline">{emp.email}</a>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {emp.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[emp.status]}`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditEmployee(emp); setEmpModal(true); }}
                              title="Edit"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteEmp(emp)}
                              title="Delete"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
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
          </div>
        )}

        {/* ── Vendors Tab ── */}
        {tab === "vendors" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 whitespace-nowrap">Code</th>
                    <th className="px-4 py-3 whitespace-nowrap">Company Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Contact Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 whitespace-nowrap">Phone</th>
                    <th className="px-4 py-3 whitespace-nowrap">Country</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vndFetching ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="h-4 rounded bg-gray-100 animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : vendors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                        No vendors found. Click "Add Vendor" to get started.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((vnd) => (
                      <tr key={vnd.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5 text-xs text-gray-400 font-mono whitespace-nowrap">
                          {vnd.vendor_code}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                          {vnd.company_name}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {vnd.contact_name ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {vnd.email ? (
                            <a href={`mailto:${vnd.email}`} className="text-blue-600 hover:underline">{vnd.email}</a>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {vnd.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {vnd.country ?? "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[vnd.status]}`}>
                            {vnd.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditVendor(vnd); setVndModal(true); }}
                              title="Edit"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteVnd(vnd)}
                              title="Delete"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
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
          </div>
        )}
      </div>

      {/* Modals */}
      <EmployeeModal
        open={empModal}
        employee={editEmployee}
        onClose={() => { setEmpModal(false); setEditEmployee(null); }}
        onSuccess={loadEmployees}
      />

      <VendorModal
        open={vndModal}
        vendor={editVendor}
        onClose={() => { setVndModal(false); setEditVendor(null); }}
        onSuccess={loadVendors}
      />

      <DeleteTeamDialog
        open={!!deleteEmp}
        name={deleteEmp?.full_name ?? ""}
        loading={deletingEmp}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setDeleteEmp(null)}
      />

      <DeleteTeamDialog
        open={!!deleteVnd}
        name={deleteVnd?.company_name ?? ""}
        loading={deletingVnd}
        onConfirm={handleDeleteVendor}
        onCancel={() => setDeleteVnd(null)}
      />
    </>
  );
}
