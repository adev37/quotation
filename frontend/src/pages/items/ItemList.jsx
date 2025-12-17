// src/pages/inventory/ItemList.jsx
import React, { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  useGetItemsQuery,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from "../../services/inventoryApi";

// Compute a sliding window of pages (default window of 10)
const getVisiblePages = (total, current, windowSize = 10) => {
  if (total <= windowSize) return { pages: Array.from({ length: total }, (_, i) => i + 1) };

  const blockStart = Math.floor((current - 1) / windowSize) * windowSize + 1; // 1,11,21,...
  const blockEnd = Math.min(blockStart + windowSize - 1, total);
  const pages = Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i);

  return {
    pages,
    showLeftEllipsis: blockStart > 1,
    showRightEllipsis: blockEnd < total,
  };
};

const ItemList = () => {
  const { data, isLoading, refetch } = useGetItemsQuery();
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();

  const items = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
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
  const itemsPerPage = 11;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItem(id).unwrap();
      toast.success("🗑️ Item deleted successfully");
    } catch (err) {
      toast.error("❌ Failed to delete item");
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setEditData(item);
  };

  const handleSave = async () => {
    try {
      await updateItem({ id: editingId, ...editData }).unwrap();
      setEditingId(null);
      toast.success("✅ Item updated successfully");
      refetch();
    } catch {
      toast.error("❌ Failed to update item");
    }
  };

  const filteredItems = items.filter(
    (item) =>
      (item.name?.toLowerCase().includes(searchItemModel.toLowerCase()) ||
        item.modelNo?.toLowerCase().includes(searchItemModel.toLowerCase())) &&
      item.companyName?.toLowerCase().includes(searchCompany.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToExcel = () => {
    const exportData = filteredItems.map((item, idx) => ({
      "Sl#": idx + 1,
      "Item Name": item.name,
      "Model No.": item.modelNo,
      Company: item.companyName,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Items");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Item_List.xlsx");
  };

  return (
    <div className="p-6 pb-36 relative bg-gray-50 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">📋</span> Item Master List
      </h2>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by Item / Model"
          className="border px-3 py-2 rounded w-64"
          value={searchItemModel}
          onChange={(e) => {
            setSearchItemModel(e.target.value);
            setCurrentPage(1);
          }}
        />
        <input
          type="text"
          placeholder="Search by Company"
          className="border px-3 py-2 rounded w-64"
          value={searchCompany}
          onChange={(e) => {
            setSearchCompany(e.target.value);
            setCurrentPage(1);
          }}
        />
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          📄 Export to Excel
        </button>
      </div>

      {isLoading ? (
        <p className="text-blue-600 animate-pulse">Loading items...</p>
      ) : currentItems.length === 0 ? (
        <p className="text-gray-600">No items found.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full">
            <thead className="bg-blue-100">
              <tr>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Item Name</th>
                <th className="text-left px-4 py-2">Model No.</th>
                <th className="text-left px-4 py-2">Company</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, idx) => (
                <tr
                  key={item._id}
                  className="border-t hover:bg-gray-50"
                  onDoubleClick={() => handleEditClick(item)}
                >
                  <td className="px-4 py-2">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>

                  {editingId === item._id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          name="name"
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          name="modelNo"
                          value={editData.modelNo}
                          onChange={(e) =>
                            setEditData({ ...editData, modelNo: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          name="companyName"
                          value={editData.companyName}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              companyName: e.target.value,
                            })
                          }
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2 text-blue-600 underline space-x-4">
                        <button onClick={handleSave} className="hover:text-green-700">
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="hover:text-red-600"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.modelNo}</td>
                      <td className="px-4 py-2">{item.companyName}</td>
                      <td className="px-4 py-2 text-blue-600 underline space-x-4">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="hover:text-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white py-3 shadow-md flex justify-center gap-2 z-10">
          {/* Prev */}
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
          >
            ◀ Prev
          </button>

          {(() => {
            const { pages, showLeftEllipsis, showRightEllipsis } = getVisiblePages(
              totalPages,
              currentPage,
              10
            );

            return (
              <>
                {showLeftEllipsis && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-1 rounded bg-gray-200 text-gray-700"
                    >
                      1
                    </button>
                    <span className="px-1 text-gray-500">…</span>
                  </>
                )}

                {pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1 rounded ${
                      currentPage === p
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {showRightEllipsis && (
                  <>
                    <span className="px-1 text-gray-500">…</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-1 rounded bg-gray-200 text-gray-700"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </>
            );
          })()}

          {/* Next */}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className={`px-3 py-1 rounded ${
              currentPage === totalPages
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
          >
            Next ▶
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemList;
