"use client";

import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { fetchAllClients, deleteClient } from "@/services/clientService";
import type { Client } from "@/types/database";
import ClientModal from "@/components/clients/ClientModal";
import DeleteClientDialog from "@/components/clients/DeleteClientDialog";

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
};

export default function ClientsPage() {
  const [clients,      setClients]      = useState<Client[]>([]);
  const [fetching,     setFetching]     = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editClient,   setEditClient]   = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const loadClients = useCallback(async () => {
    setFetching(true);
    try {
      setClients(await fetchAllClients());
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleEdit = (client: Client) => {
    setEditClient(client);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClient(deleteTarget.id);
      toast.success("Client deleted");
      setDeleteTarget(null);
      loadClients();
    } catch {
      toast.error("Failed to delete client. It may be linked to existing projects.");
    } finally {
      setDeleting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditClient(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Clients</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {fetching
                ? "Loading…"
                : `${clients.length} client${clients.length !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadClients}
              title="Refresh"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => { setEditClient(null); setModalOpen(true); }}
              className="h-9 px-4 flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              New Client
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 whitespace-nowrap">Company Name</th>
                  <th className="px-4 py-3 whitespace-nowrap">Contact Person</th>
                  <th className="px-4 py-3 whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 whitespace-nowrap">Phone</th>
                  <th className="px-4 py-3 whitespace-nowrap">Country</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fetching ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                      No clients found. Click "New Client" to get started.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {client.client_code}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-900 max-w-[180px] truncate">
                        {client.company_name}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        {client.contact_person ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        {client.email ? (
                          <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                            {client.email}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        {client.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        {client.country ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[client.status]}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(client)}
                            title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(client)}
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
      </div>

      <ClientModal
        open={modalOpen}
        client={editClient}
        onClose={handleModalClose}
        onSuccess={loadClients}
      />

      <DeleteClientDialog
        open={!!deleteTarget}
        clientName={deleteTarget?.company_name ?? ""}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
