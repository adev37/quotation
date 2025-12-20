import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetWarehousesQuery,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
} from "../../services/inventoryApi";

export default function WarehouseList() {
  const { data, isFetching, isError, error, refetch } = useGetWarehousesQuery();

  const warehouses = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);

  const [updateWarehouse, { isLoading: saving }] = useUpdateWarehouseMutation();
  const [deleteWarehouse, { isLoading: deleting }] = useDeleteWarehouseMutation();

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: "", location: "" });

  const beginEdit = (wh) => {
    setEditingId(wh._id);
    setEditData({ name: wh.name || "", location: wh.location || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: "", location: "" });
  };

  const handleChange = (e) =>
    setEditData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!editingId) return;

    try {
      await updateWarehouse({
        id: editingId,
        name: String(editData.name || "").trim(),
        location: String(editData.location || "").trim(),
      }).unwrap();

      toast.success("✅ Warehouse updated successfully.");
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to update warehouse.");
      console.error("Update error:", err);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this warehouse?");
    if (!ok) return;

    try {
      await deleteWarehouse(id).unwrap();
      toast.success("🗑️ Warehouse deleted successfully.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to delete warehouse.");
      console.error("Delete error:", err);
    }
  };

  const loading = isFetching && warehouses.length === 0;

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  🏬
                </span>
                Warehouses
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Double-click a row to edit inline.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2"
                type="button"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">Tip</div>
              <div className="text-sm font-semibold text-slate-900">
                Edit faster by double-clicking a row
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-sm font-semibold text-slate-900">
                  {warehouses.length}
                </div>
              </div>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                Warehouses
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          {loading ? (
            <TableSkeleton />
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
              Failed to load. {error?.data?.message || ""}
            </div>
          ) : warehouses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
              No warehouses found.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">#</th>
                    <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">
                      Warehouse Name
                    </th>
                    <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Location</th>
                    <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {warehouses.map((wh, idx) => {
                    const isEditing = editingId === wh._id;

                    return (
                      <tr
                        key={wh._id}
                        className="border-t border-slate-200 hover:bg-slate-50"
                        onDoubleClick={() => beginEdit(wh)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{idx + 1}</td>

                        {isEditing ? (
                          <>
                            <td className="px-4 py-3">
                              <TextInput
                                name="name"
                                value={editData.name}
                                onChange={handleChange}
                                placeholder="Warehouse name"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <TextInput
                                name="location"
                                value={editData.location}
                                onChange={handleChange}
                                placeholder="Location"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={handleSave}
                                  disabled={saving}
                                  className={[
                                    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white",
                                    saving
                                      ? "bg-slate-400 cursor-not-allowed"
                                      : "bg-emerald-600 hover:bg-emerald-700",
                                  ].join(" ")}
                                  type="button"
                                >
                                  {saving ? "Saving..." : "Save"}
                                </button>

                                <button
                                  onClick={cancelEdit}
                                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {wh.name || "-"}
                            </td>

                            <td className="px-4 py-3 text-slate-700">
                              {wh.location || "-"}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => beginEdit(wh)}
                                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                  type="button"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => handleDelete(wh._id)}
                                  disabled={deleting}
                                  className={[
                                    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white",
                                    deleting
                                      ? "bg-slate-400 cursor-not-allowed"
                                      : "bg-rose-600 hover:bg-rose-700",
                                  ].join(" ")}
                                  type="button"
                                >
                                  Delete
                                </button>
                              </div>

                              <div className="mt-2 text-[11px] text-slate-400">
                                Double-click to edit.
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm",
        "placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-52 bg-slate-100 rounded animate-pulse" />
      <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );
}
