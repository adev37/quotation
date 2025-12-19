import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  useGetItemsQuery,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from "../../services/inventoryApi";

// sliding window pages
const getVisiblePages = (total, current, windowSize = 7) => {
  if (total <= windowSize)
    return { pages: Array.from({ length: total }, (_, i) => i + 1) };

  const blockStart = Math.floor((current - 1) / windowSize) * windowSize + 1;
  const blockEnd = Math.min(blockStart + windowSize - 1, total);
  const pages = Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i);

  return {
    pages,
    showLeftEllipsis: blockStart > 1,
    showRightEllipsis: blockEnd < total,
  };
};

const ItemList = () => {
  const { data, isLoading, isError, error, refetch } = useGetItemsQuery();
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();

  const items = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [data]);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    modelNo: "",
    companyName: "",
    minStockAlert: 0,
  });

  const [searchItemModel, setSearchItemModel] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItem(id).unwrap();
      toast.success("🗑️ Item deleted successfully");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to delete item");
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setEditData({
      name: item.name || "",
      modelNo: item.modelNo || "",
      companyName: item.companyName || "",
      minStockAlert: item.minStockAlert ?? 0,
    });
  };

  const handleSave = async () => {
    try {
      await updateItem({ id: editingId, ...editData }).unwrap();
      setEditingId(null);
      toast.success("✅ Item updated successfully");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to update item");
    }
  };

  const filteredItems = useMemo(() => {
    const q1 = searchItemModel.trim().toLowerCase();
    const q2 = searchCompany.trim().toLowerCase();

    return items.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const model = (item.modelNo || "").toLowerCase();
      const company = (item.companyName || "").toLowerCase();

      const matchItemModel = !q1 || name.includes(q1) || model.includes(q1);
      const matchCompany = !q2 || company.includes(q2);
      return matchItemModel && matchCompany;
    });
  }, [items, searchItemModel, searchCompany]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * itemsPerPage;
  const end = safePage * itemsPerPage;
  const currentItems = filteredItems.slice(start, end);

  const exportToExcel = () => {
    const exportData = filteredItems.map((item, idx) => ({
      "Sl#": idx + 1,
      "Item Name": item.name || "-",
      "Model No.": item.modelNo || "-",
      Company: item.companyName || "-",
      "Min Stock Alert": item.minStockAlert ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "Item_List.xlsx"
    );
  };

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={2500} />

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  📋 Item Master List
                </h2>
                <p className="text-sm text-slate-500">
                  Double-click a row to edit inline.
                </p>
              </div>

              <button
                onClick={exportToExcel}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
              >
                📄 Export
              </button>
            </div>

            {/* Filters */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Search by Item / Model"
                className="border rounded-lg px-3 py-2 text-sm w-full"
                value={searchItemModel}
                onChange={(e) => {
                  setSearchItemModel(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <input
                type="text"
                placeholder="Search by Company"
                className="border rounded-lg px-3 py-2 text-sm w-full"
                value={searchCompany}
                onChange={(e) => {
                  setSearchCompany(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <div className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm text-slate-600">
                <span>Total:</span>
                <span className="font-semibold text-slate-900">
                  {filteredItems.length}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="mt-4">
              {isLoading ? (
                <p className="text-blue-600 text-sm">Loading items…</p>
              ) : isError ? (
                <p className="text-red-600 text-sm">
                  Failed to load. {error?.data?.message || ""}
                </p>
              ) : currentItems.length === 0 ? (
                <p className="text-slate-600 text-sm">No items found.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-left whitespace-nowrap">#</th>
                        <th className="px-4 py-3 text-left whitespace-nowrap">
                          Item Name
                        </th>
                        <th className="px-4 py-3 text-left whitespace-nowrap">
                          Model No.
                        </th>
                        <th className="px-4 py-3 text-left whitespace-nowrap">
                          Company
                        </th>
                        <th className="px-4 py-3 text-left whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentItems.map((item, idx) => (
                        <tr
                          key={item._id}
                          className="border-t hover:bg-slate-50"
                          onDoubleClick={() => handleEditClick(item)}
                        >
                          <td className="px-4 py-3">
                            {start + idx + 1}
                          </td>

                          {editingId === item._id ? (
                            <>
                              <td className="px-4 py-3">
                                <input
                                  value={editData.name}
                                  onChange={(e) =>
                                    setEditData((p) => ({ ...p, name: e.target.value }))
                                  }
                                  className="w-full border rounded-lg px-2 py-1 text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={editData.modelNo}
                                  onChange={(e) =>
                                    setEditData((p) => ({
                                      ...p,
                                      modelNo: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded-lg px-2 py-1 text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={editData.companyName}
                                  onChange={(e) =>
                                    setEditData((p) => ({
                                      ...p,
                                      companyName: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded-lg px-2 py-1 text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={handleSave}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3">{item.name || "-"}</td>
                              <td className="px-4 py-3">{item.modelNo || "-"}</td>
                              <td className="px-4 py-3">{item.companyName || "-"}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item._id)}
                                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm"
                                  >
                                    Delete
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

            {/* Pagination (sticky, mobile friendly) */}
            {filteredItems.length > 0 && totalPages > 1 && (
              <div className="mt-5 sticky bottom-0 z-10 bg-white/90 backdrop-blur border rounded-xl p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    Page{" "}
                    <span className="font-semibold text-slate-900">{safePage}</span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">{totalPages}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        safePage === 1
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      ◀ Prev
                    </button>

                    {/* Page numbers (compact window) */}
                    <div className="hidden sm:flex items-center gap-2">
                      {(() => {
                        const { pages, showLeftEllipsis, showRightEllipsis } =
                          getVisiblePages(totalPages, safePage, 7);

                        return (
                          <>
                            {showLeftEllipsis && (
                              <>
                                <button
                                  onClick={() => setCurrentPage(1)}
                                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                                >
                                  1
                                </button>
                                <span className="text-slate-400">…</span>
                              </>
                            )}

                            {pages.map((p) => (
                              <button
                                key={p}
                                onClick={() => setCurrentPage(p)}
                                className={`px-3 py-1.5 rounded-lg text-sm ${
                                  safePage === p
                                    ? "bg-blue-600 text-white"
                                    : "border hover:bg-slate-50"
                                }`}
                              >
                                {p}
                              </button>
                            ))}

                            {showRightEllipsis && (
                              <>
                                <span className="text-slate-400">…</span>
                                <button
                                  onClick={() => setCurrentPage(totalPages)}
                                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                                >
                                  {totalPages}
                                </button>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <button
                      disabled={safePage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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

            <p className="mt-3 text-xs text-slate-500">
              Mobile tip: Table scrolls horizontally. Pagination stays visible (sticky).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemList;
