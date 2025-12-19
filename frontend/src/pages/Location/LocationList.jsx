// src/pages/Location/LocationList.jsx
import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  useGetGroupedLocationsQuery,
  useUpdateLocationByNameMutation,
  useDeleteLocationByNameMutation,
  useImportLocationsExcelMutation,
} from "../../services/inventoryApi";

const ITEMS_PER_PAGE = 10;

const LocationList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useGetGroupedLocationsQuery({
    page,
    limit: ITEMS_PER_PAGE,
    search,
  });

  const groupedLocations = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  const [updateByName, { isLoading: isUpdating }] = useUpdateLocationByNameMutation();
  const [deleteByName, { isLoading: isDeleting }] = useDeleteLocationByNameMutation();
  const [importExcel, { isLoading: isImporting }] = useImportLocationsExcelMutation();

  const [editingName, setEditingName] = useState(null);
  const [editData, setEditData] = useState({ newName: "", description: "" });

  const [file, setFile] = useState(null);

  const totalPages = useMemo(() => meta.totalPages || 1, [meta.totalPages]);

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
    try {
      await updateByName({
        name: editingName,
        newName: editData.newName,
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

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🗃️ Location (Rack) List
      </h2>

      {/* Top Bar: Search + Import */}
      <div className="bg-white shadow rounded p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex gap-2 w-full md:w-1/2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search rack name..."
            className="w-full border rounded px-3 py-2"
          />
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            🔄
          </button>
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border rounded px-3 py-2 w-full md:w-72"
          />
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60"
          >
            {isImporting ? "Importing..." : "⬆️ Import Excel"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-blue-500">Loading locations...</p>
      ) : groupedLocations.length === 0 ? (
        <p className="text-gray-500">No locations found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto bg-white shadow rounded">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">Location Name</th>
                  <th className="p-2 border">Warehouses</th>
                  <th className="p-2 border">Description</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedLocations.map((loc, idx) => (
                  <tr key={loc._id || loc.name} className="border-t hover:bg-gray-50">
                    <td className="p-2 border">
                      {(page - 1) * ITEMS_PER_PAGE + idx + 1}
                    </td>

                    {editingName === loc.name ? (
                      <>
                        <td className="p-2 border">
                          <input
                            name="newName"
                            value={editData.newName}
                            onChange={(e) =>
                              setEditData((s) => ({ ...s, newName: e.target.value }))
                            }
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>

                        <td className="p-2 border text-sm text-gray-700">
                          {(loc.warehouses || []).join(", ")}
                        </td>

                        <td className="p-2 border">
                          <input
                            name="description"
                            value={editData.description}
                            onChange={(e) =>
                              setEditData((s) => ({ ...s, description: e.target.value }))
                            }
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>

                        <td className="p-2 border flex gap-2">
                          <button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-60"
                          >
                            💾 Save All
                          </button>
                          <button
                            onClick={() => setEditingName(null)}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"
                          >
                            ❌ Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border">{loc.name}</td>
                        <td className="p-2 border text-sm text-gray-700">
                          {(loc.warehouses || []).join(", ")}
                        </td>
                        <td className="p-2 border">{loc.description || "—"}</td>
                        <td className="p-2 border flex gap-2">
                          <button
                            onClick={() => handleEditClick(loc)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                          >
                            ✏️ Edit All
                          </button>
                          <button
                            onClick={() => handleDeleteAllByName(loc.name)}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded disabled:opacity-60"
                          >
                            🗑 Delete All
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="px-4 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              ⬅️ Previous
            </button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-4 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              Next ➡️
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationList;
