import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  useGetGroupedLocationsQuery,
  useUpdateLocationByNameMutation,
  useDeleteLocationByNameMutation,
  useImportLocationsExcelMutation,
} from "../../services/inventoryApi";

const ITEMS_PER_PAGE = 6;

const LocationList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState(null);

  const { data, isLoading, isError, error, refetch } =
    useGetGroupedLocationsQuery({
      page,
      limit: ITEMS_PER_PAGE,
      search,
    });

  const groupedLocations = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };
  const totalPages = useMemo(() => meta.totalPages || 1, [meta.totalPages]);

  const [updateByName, { isLoading: isUpdating }] =
    useUpdateLocationByNameMutation();
  const [deleteByName, { isLoading: isDeleting }] =
    useDeleteLocationByNameMutation();
  const [importExcel, { isLoading: isImporting }] =
    useImportLocationsExcelMutation();

  const [editingName, setEditingName] = useState(null);
  const [editData, setEditData] = useState({ newName: "", description: "" });

  const handleDeleteAllByName = async (name) => {
    const confirm = window.confirm(`Delete ALL entries for "${name}" rack?`);
    if (!confirm) return;

    try {
      await deleteByName(name).unwrap();
      toast.success(`🗑️ Deleted "${name}" from all warehouses`);
      setEditingName(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to delete rack group.");
      console.error("Delete error:", err);
    }
  };

  const handleEditClick = (loc) => {
    setEditingName(loc.name);
    setEditData({ newName: loc.name, description: loc.description || "" });
  };

  const handleUpdate = async () => {
    if (!editingName) return;

    if (!editData.newName.trim()) {
      return toast.error("Rack name cannot be empty");
    }

    try {
      await updateByName({
        name: editingName,
        newName: editData.newName.trim(),
        description: editData.description,
      }).unwrap();

      toast.success("✅ Rack group updated successfully.");
      setEditingName(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to update rack group.");
      console.error("Update error:", err);
    }
  };

  const handleImport = async () => {
    if (!file) return toast.error("Please select an Excel file");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await importExcel(fd).unwrap();
      toast.success(res?.message || "✅ Imported!");
      setFile(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Excel import failed");
      console.error("Import error:", err);
    }
  };

  const safePage = Math.min(Math.max(page, 1), totalPages);

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  🗃️ Location (Rack) List
                </h2>
                <p className="text-sm text-slate-500">
                  Manage rack names across all warehouses. Mobile friendly UI.
                </p>
              </div>

              <button
                onClick={() => refetch()}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Top Bar */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Search */}
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search rack name..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50"
                  title="Search"
                >
                  🔎
                </button>
              </div>

              {/* File */}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />

              {/* Import button */}
              <button
                onClick={handleImport}
                disabled={isImporting}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${
                  isImporting
                    ? "bg-slate-400 cursor-wait"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isImporting ? "Importing..." : "⬆️ Import Excel"}
              </button>
            </div>

            {/* Content */}
            <div className="mt-4">
              {isLoading ? (
                <p className="text-blue-600 text-sm">Loading locations…</p>
              ) : isError ? (
                <p className="text-red-600 text-sm">
                  Failed to load. {error?.data?.message || ""}
                </p>
              ) : groupedLocations.length === 0 ? (
                <p className="text-slate-500 text-sm">No locations found.</p>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border">
                  <table className="min-w-[1050px] w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                      <tr>
                        <th className="p-3 border-b whitespace-nowrap">#</th>
                        <th className="p-3 border-b whitespace-nowrap">
                          Location Name
                        </th>
                        <th className="p-3 border-b whitespace-nowrap">
                          Warehouses
                        </th>
                        <th className="p-3 border-b whitespace-nowrap">
                          Description
                        </th>
                        <th className="p-3 border-b whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {groupedLocations.map((loc, idx) => (
                        <tr
                          key={loc._id || loc.name}
                          className="border-t hover:bg-slate-50 align-top"
                        >
                          <td className="p-3 whitespace-nowrap">
                            {(safePage - 1) * ITEMS_PER_PAGE + idx + 1}
                          </td>

                          {editingName === loc.name ? (
                            <>
                              <td className="p-3">
                                <input
                                  value={editData.newName}
                                  onChange={(e) =>
                                    setEditData((s) => ({
                                      ...s,
                                      newName: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded-lg px-2 py-1 text-sm"
                                />
                              </td>

                              <td className="p-3 text-sm text-slate-700">
                                {(loc.warehouses || []).join(", ")}
                              </td>

                              <td className="p-3">
                                <input
                                  value={editData.description}
                                  onChange={(e) =>
                                    setEditData((s) => ({
                                      ...s,
                                      description: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded-lg px-2 py-1 text-sm"
                                />
                              </td>

                              <td className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={handleUpdate}
                                    disabled={isUpdating}
                                    className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium ${
                                      isUpdating
                                        ? "bg-slate-400 cursor-wait"
                                        : "bg-emerald-600 hover:bg-emerald-700"
                                    }`}
                                  >
                                    💾 Save All
                                  </button>
                                  <button
                                    onClick={() => setEditingName(null)}
                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                                  >
                                    ❌ Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 font-medium text-slate-900">
                                {loc.name}
                              </td>

                              <td className="p-3 text-slate-700">
                                {(loc.warehouses || []).join(", ")}
                              </td>

                              <td className="p-3 text-slate-700">
                                {loc.description || "—"}
                              </td>

                              <td className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleEditClick(loc)}
                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                                  >
                                    ✏️ Edit All
                                  </button>

                                  <button
                                    onClick={() => handleDeleteAllByName(loc.name)}
                                    disabled={isDeleting}
                                    className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium ${
                                      isDeleting
                                        ? "bg-slate-400 cursor-wait"
                                        : "bg-rose-600 hover:bg-rose-700"
                                    }`}
                                  >
                                    🗑 Delete All
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination (sticky bottom) */}
            {groupedLocations.length > 0 && totalPages > 1 && (
              <div className="mt-5 sticky bottom-0 z-10 bg-white/90 backdrop-blur border rounded-xl p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    Page{" "}
                    <span className="font-semibold text-slate-900">{safePage}</span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">{totalPages}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      disabled={safePage === 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        safePage === 1
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      ◀ Prev
                    </button>

                    <button
                      disabled={safePage === totalPages}
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        safePage === totalPages
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Next ▶
                    </button>
                  </div>
                </div>
              </div>
            )}

           
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationList;
