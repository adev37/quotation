import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  useGetItemsQuery,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from "../../services/inventoryApi";

/**
 * Sliding window pages
 */
const getVisiblePages = (total, current, windowSize = 7) => {
  if (total <= windowSize) {
    return { pages: Array.from({ length: total }, (_, i) => i + 1) };
  }

  const blockStart = Math.floor((current - 1) / windowSize) * windowSize + 1;
  const blockEnd = Math.min(blockStart + windowSize - 1, total);
  const pages = Array.from(
    { length: blockEnd - blockStart + 1 },
    (_, i) => blockStart + i
  );

  return {
    pages,
    showLeftEllipsis: blockStart > 1,
    showRightEllipsis: blockEnd < total,
  };
};

export default function ItemList() {
  const { data, isLoading, isError, error, refetch } = useGetItemsQuery();
  const [updateItem, { isLoading: saving }] = useUpdateItemMutation();
  const [deleteItem, { isLoading: deleting }] = useDeleteItemMutation();

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
  const itemsPerPage = 5;

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

  const beginEdit = (item) => {
    setEditingId(item._id);
    setEditData({
      name: item.name || "",
      modelNo: item.modelNo || "",
      companyName: item.companyName || "",
      minStockAlert: item.minStockAlert ?? 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: "", modelNo: "", companyName: "", minStockAlert: 0 });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updateItem({
        id: editingId,
        ...editData,
        minStockAlert: Number(editData.minStockAlert || 0),
      }).unwrap();

      toast.success("✅ Item updated successfully");
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to update item");
    }
  };

  const handleDelete = async (id) => {
    if (deleting) return;
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteItem(id).unwrap();
      toast.success("🗑️ Item deleted successfully");
      if (currentItems.length === 1 && safePage > 1) setCurrentPage((p) => p - 1);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to delete item");
    }
  };

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

  const headerRight = (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <button
        onClick={exportToExcel}
        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2"
        type="button"
      >
        📄 Export
      </button>
      <button
        onClick={() => refetch()}
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2"
        type="button"
      >
        ↻ Refresh
      </button>
    </div>
  );

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={2500} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  📋
                </span>
                Item Master
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Double-click a row to edit inline.
              </p>
            </div>

            {headerRight}
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <TextInput
              type="text"
              placeholder="Search by Item / Model"
              value={searchItemModel}
              onChange={(e) => {
                setSearchItemModel(e.target.value);
                setCurrentPage(1);
              }}
            />

            <TextInput
              type="text"
              placeholder="Search by Company"
              value={searchCompany}
              onChange={(e) => {
                setSearchCompany(e.target.value);
                setCurrentPage(1);
              }}
            />

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-slate-900">
                  {filteredItems.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                Showing {currentItems.length} items
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
              Failed to load. {error?.data?.message || ""}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
              No items found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">#</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Item Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Model No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Company</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Min Alert</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.map((item, idx) => {
                    const isEditing = editingId === item._id;

                    return (
                      <tr
                        key={item._id}
                        className="border-t border-slate-200 hover:bg-slate-50"
                        onDoubleClick={() => beginEdit(item)}
                      >
                        <td className="px-4 py-3">{start + idx + 1}</td>

                        {isEditing ? (
                          <>
                            <td className="px-4 py-3">
                              <TextInput
                                value={editData.name}
                                onChange={(e) =>
                                  setEditData((p) => ({ ...p, name: e.target.value }))
                                }
                              />
                            </td>

                            <td className="px-4 py-3">
                              <TextInput
                                value={editData.modelNo}
                                onChange={(e) =>
                                  setEditData((p) => ({ ...p, modelNo: e.target.value }))
                                }
                              />
                            </td>

                            <td className="px-4 py-3">
                              <TextInput
                                value={editData.companyName}
                                onChange={(e) =>
                                  setEditData((p) => ({
                                    ...p,
                                    companyName: e.target.value,
                                  }))
                                }
                              />
                            </td>

                            <td className="px-4 py-3">
                              <TextInput
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={editData.minStockAlert}
                                onChange={(e) =>
                                  setEditData((p) => ({
                                    ...p,
                                    minStockAlert: e.target.value,
                                  }))
                                }
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
                            <td className="px-4 py-3">{item.name || "-"}</td>
                            <td className="px-4 py-3">{item.modelNo || "-"}</td>
                            <td className="px-4 py-3">{item.companyName || "-"}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {item.minStockAlert ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => beginEdit(item)}
                                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                  type="button"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => handleDelete(item._id)}
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

        {/* Pagination */}
        {filteredItems.length > 0 && totalPages > 1 ? (
          <div className="px-3 sm:px-6 pb-4">
            <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm px-3 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs text-slate-600">
                  Page{" "}
                  <span className="font-semibold text-slate-900">{safePage}</span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">{totalPages}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <PagerButton
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    label="◀ Prev"
                  />

                  {/* Page numbers */}
                  <div className="hidden sm:flex items-center gap-2">
                    {(() => {
                      const { pages, showLeftEllipsis, showRightEllipsis } =
                        getVisiblePages(totalPages, safePage, 7);

                      return (
                        <>
                          {showLeftEllipsis ? (
                            <>
                              <PageButton
                                active={safePage === 1}
                                onClick={() => setCurrentPage(1)}
                                label="1"
                              />
                              <span className="text-slate-400">…</span>
                            </>
                          ) : null}

                          {pages.map((p) => (
                            <PageButton
                              key={p}
                              active={safePage === p}
                              onClick={() => setCurrentPage(p)}
                              label={String(p)}
                            />
                          ))}

                          {showRightEllipsis ? (
                            <>
                              <span className="text-slate-400">…</span>
                              <PageButton
                                active={safePage === totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                                label={String(totalPages)}
                              />
                            </>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>

                  <PagerButton
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    label="Next ▶"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
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

function PagerButton({ disabled, onClick, label }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold",
        disabled
          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
          : "bg-indigo-600 text-white hover:bg-indigo-700",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}

function PageButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold border",
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}

function TableSkeleton() {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="h-4 w-44 bg-slate-100 rounded animate-pulse" />
      <div className="mt-3 h-28 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="mt-3 h-28 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );
}
