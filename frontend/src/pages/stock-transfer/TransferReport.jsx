// src/pages/transfers/TransferReport.jsx
import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  useGetTransfersQuery,
  useGetWarehousesQuery,
} from "../../services/inventoryApi";

const ITEMS_PER_PAGE = 10;

const TransferReport = () => {
  const { data: transfers = [], isFetching } = useGetTransfersQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();

  const [searchText, setSearchText] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTransfers = useMemo(() => {
    let rows = Array.isArray(transfers) ? transfers : [];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      rows = rows.filter(
        (t) =>
          (t.item?.name || "").toLowerCase().includes(q) ||
          (t.item?.modelNo || "").toLowerCase().includes(q)
      );
    }

    if (selectedWarehouse) {
      rows = rows.filter(
        (t) =>
          t.fromWarehouse?._id === selectedWarehouse ||
          t.toWarehouse?._id === selectedWarehouse
      );
    }

    // newest first
    rows = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));

    return rows;
  }, [transfers, searchText, selectedWarehouse]);

  useEffect(() => setCurrentPage(1), [searchText, selectedWarehouse]);

  const exportToExcel = () => {
    const exportData = filteredTransfers.map((t) => ({
      Date: moment(t.date).format("DD-MM-YYYY"),
      Item: t.item?.name || "N/A",
      "Model No.": t.item?.modelNo || "-",
      Quantity: t.quantity,
      From: t.fromWarehouse?.name || "-",
      To: t.toWarehouse?.name || "-",
      Remarks: t.note || t.reason || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfer Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Transfer_Report.xlsx");
  };

  // pagination
  const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE) || 1;
  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const pageRows = filteredTransfers.slice(indexOfFirst, indexOfLast);

  return (
    <div className="w-full">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                  📋 Stock Transfer Report
                </h2>
                <p className="text-sm text-slate-500">
                  Filter and export transfers. Table scrolls horizontally on mobile.
                </p>
              </div>

              <button
                onClick={exportToExcel}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
              >
                📄 Export Excel
              </button>
            </div>

            {/* Filters */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search item / model no"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Warehouse
                </label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Warehouses</option>
                  {(warehouses || []).map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <button
                  onClick={() => {
                    setSearchText("");
                    setSelectedWarehouse("");
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50"
                >
                  🔄 Reset
                </button>
              </div>

              <div className="hidden lg:block" />
            </div>

            {/* Table */}
            <div className="mt-4 w-full overflow-x-auto rounded-xl border">
              {isFetching ? (
                <div className="p-5 text-sm text-indigo-700">Loading transfers...</div>
              ) : pageRows.length === 0 ? (
                <div className="p-5 text-sm text-slate-500 italic">
                  No transfer records found.
                </div>
              ) : (
                <table className="min-w-[1050px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                    <tr>
                      <th className="p-3 border-b whitespace-nowrap">#</th>
                      <th className="p-3 border-b whitespace-nowrap">Date</th>
                      <th className="p-3 border-b whitespace-nowrap">Item</th>
                      <th className="p-3 border-b whitespace-nowrap">Model No.</th>
                      <th className="p-3 border-b whitespace-nowrap">Qty</th>
                      <th className="p-3 border-b whitespace-nowrap">From</th>
                      <th className="p-3 border-b whitespace-nowrap">To</th>
                      <th className="p-3 border-b whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((t, i) => (
                      <tr key={t._id || i} className="border-t hover:bg-slate-50">
                        <td className="p-3 border-b">
                          {indexOfFirst + i + 1}
                        </td>
                        <td className="p-3 border-b whitespace-nowrap">
                          {moment(t.date).format("DD-MM-YYYY")}
                        </td>
                        <td className="p-3 border-b">{t.item?.name || "N/A"}</td>
                        <td className="p-3 border-b">{t.item?.modelNo || "-"}</td>
                        <td className="p-3 border-b">{t.quantity}</td>
                        <td className="p-3 border-b">{t.fromWarehouse?.name || "-"}</td>
                        <td className="p-3 border-b">{t.toWarehouse?.name || "-"}</td>
                        <td className="p-3 border-b">{t.note || t.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination (responsive) */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Showing <b>{pageRows.length}</b> of <b>{filteredTransfers.length}</b>
                </div>

                <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      currentPage === 1
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    ◀ Prev
                  </button>

                  <div className="px-3 py-1.5 rounded-lg border text-sm">
                    Page <b>{currentPage}</b> / <b>{totalPages}</b>
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      currentPage === totalPages
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
};

export default TransferReport;
