import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetWarehousesQuery,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
} from "../../services/inventoryApi";

const WarehouseList = () => {
  const {
    data: warehouses = [],
    isFetching,
    isError,
    error,
    refetch,
  } = useGetWarehousesQuery();

  const [updateWarehouse, { isLoading: saving }] = useUpdateWarehouseMutation();
  const [deleteWarehouse, { isLoading: deleting }] = useDeleteWarehouseMutation();

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: "", location: "" });

  const handleEditClick = (wh) => {
    setEditingId(wh._id);
    setEditData({ name: wh.name, location: wh.location });
  };

  const handleDoubleClick = (wh) => handleEditClick(wh);

  const handleChange = (e) =>
    setEditData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    try {
      await updateWarehouse({ id: editingId, ...editData }).unwrap();
      toast.success("✅ Warehouse updated successfully.");
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to update warehouse.");
      console.error("Update error:", err);
    }
  };

  const handleCancel = () => setEditingId(null);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this warehouse?")) return;
    try {
      await deleteWarehouse(id).unwrap();
      toast.success("🗑️ Warehouse deleted successfully.");
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to delete warehouse.");
      console.error("Delete error:", err);
    }
  };

  const loading = isFetching && warehouses.length === 0;

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  🏬 Warehouse List
                </h2>
                <p className="text-sm text-slate-500">
                  Double click a row to edit quickly. Mobile friendly table view.
                </p>
              </div>

              <button
                onClick={() => refetch()}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Content */}
            <div className="mt-4">
              {loading ? (
                <p className="text-blue-600 text-sm">Loading warehouses…</p>
              ) : isError ? (
                <p className="text-red-600 text-sm">
                  Failed to load. {error?.data?.message || ""}
                </p>
              ) : warehouses.length === 0 ? (
                <p className="text-slate-500 text-sm">No warehouses found.</p>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border">
                  <table className="min-w-[820px] w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                      <tr>
                        <th className="p-3 border-b whitespace-nowrap">#</th>
                        <th className="p-3 border-b whitespace-nowrap">
                          Warehouse Name
                        </th>
                        <th className="p-3 border-b whitespace-nowrap">Location</th>
                        <th className="p-3 border-b whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {warehouses.map((wh, idx) => (
                        <tr
                          key={wh._id}
                          className="border-t hover:bg-slate-50"
                          onDoubleClick={() => handleDoubleClick(wh)}
                        >
                          <td className="p-3 border-b whitespace-nowrap">
                            {idx + 1}
                          </td>

                          {editingId === wh._id ? (
                            <>
                              <td className="p-3 border-b">
                                <input
                                  name="name"
                                  value={editData.name}
                                  onChange={handleChange}
                                  className="w-full border rounded-lg px-2 py-1 text-sm"
                                />
                              </td>

                              <td className="p-3 border-b">
                                <input
                                  name="location"
                                  value={editData.location}
                                  onChange={handleChange}
                                  className="w-full border rounded-lg px-2 py-1 text-sm"
                                />
                              </td>

                              <td className="p-3 border-b">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium ${
                                      saving
                                        ? "bg-slate-400 cursor-wait"
                                        : "bg-emerald-600 hover:bg-emerald-700"
                                    }`}
                                  >
                                    {saving ? "Saving…" : "💾 Save"}
                                  </button>

                                  <button
                                    onClick={handleCancel}
                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                                  >
                                    ❌ Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 border-b font-medium text-slate-900">
                                {wh.name}
                              </td>

                              <td className="p-3 border-b text-slate-700">
                                {wh.location}
                              </td>

                              <td className="p-3 border-b">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleEditClick(wh)}
                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                                  >
                                    ✏️ Edit
                                  </button>

                                  <button
                                    onClick={() => handleDelete(wh._id)}
                                    disabled={deleting}
                                    className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium ${
                                      deleting
                                        ? "bg-slate-400 cursor-wait"
                                        : "bg-rose-600 hover:bg-rose-700"
                                    }`}
                                  >
                                    🗑 Delete
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

            <p className="mt-3 text-xs text-slate-500">
              Mobile tip: Swipe table left/right. Buttons auto-wrap.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseList;
