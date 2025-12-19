import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useGetLedgerQuery } from "../../services/inventoryApi";

const getVisiblePages = (total, current, windowSize = 10) => {
  if (total <= windowSize) return { pages: Array.from({ length: total }, (_, i) => i + 1) };

  const blockStart = Math.floor((current - 1) / windowSize) * windowSize + 1;
  const blockEnd = Math.min(blockStart + windowSize - 1, total);
  const pages = Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i);

  return {
    pages,
    showLeftEllipsis: blockStart > 1,
    showRightEllipsis: blockEnd < total,
  };
};

const StockLedger = () => {
  const { data: ledger = [], isLoading } = useGetLedgerQuery();

  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [actionType, setActionType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;

  useEffect(() => {
    const sorted = [...(ledger || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    setEntries(sorted);
    setFilteredEntries(sorted);
  }, [ledger]);

  const allPurposes = useMemo(
    () => Array.from(new Set((entries || []).map((e) => e.purpose).filter(Boolean))),
    [entries]
  );

  useEffect(() => {
    let filtered = [...entries];
    const lower = (searchText || "").toLowerCase();

    if (lower) {
      filtered = filtered.filter(
        (e) =>
          e.item?.name?.toLowerCase().includes(lower) ||
          e.item?.modelNo?.toLowerCase().includes(lower) ||
          e.warehouse?.name?.toLowerCase().includes(lower)
      );
    }
    if (actionType) filtered = filtered.filter((e) => e.action === actionType);
    if (purpose) filtered = filtered.filter((e) => e.purpose === purpose);
    if (dateFrom) filtered = filtered.filter((e) => new Date(e.date) >= new Date(dateFrom));
    if (dateTo) filtered = filtered.filter((e) => new Date(e.date) <= new Date(dateTo));

    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [searchText, actionType, purpose, dateFrom, dateTo, entries]);

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString("en-GB") : "-");

  const exportToExcel = () => {
    const exportData = filteredEntries.map((entry, idx) => ({
      "Sl#": idx + 1,
      Date: formatDate(entry.date),
      Item: entry.item?.name || "-",
      "Model No.": entry.item?.modelNo || "-",
      Warehouse: entry.warehouse?.name || "-",
      "Rack/Location": entry.locationDisplay || "-",
      "Qty (+/-)": entry.quantity,
      Action: entry.action,
      Purpose: entry.purpose || "-",
      Remarks: entry.remarks || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Ledger");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Stock_Ledger.xlsx");
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil((filteredEntries.length || 0) / itemsPerPage) || 1;

  const handleReset = () => {
    setSearchText("");
    setActionType("");
    setPurpose("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50">
      <div className="mx-auto w-full max-w-[1200px]">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">📒 Stock Ledger</h2>

        {/* ✅ Responsive Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Item / Model / Warehouse"
              className="border px-3 py-2 rounded w-full"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Action</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="">All</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="">All</option>
              {allPurposes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div className="flex gap-2 lg:col-span-6 lg:justify-end">
            <button
              onClick={handleReset}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full sm:w-auto"
            >
              Reset
            </button>
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full sm:w-auto"
            >
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full shadow rounded bg-white">
          {isLoading ? (
            <p className="p-6 text-blue-600">Loading ledger...</p>
          ) : currentItems.length === 0 ? (
            <p className="p-6 text-gray-500">No records found.</p>
          ) : (
            <table className="min-w-[1100px] table-auto border border-gray-300 text-sm whitespace-nowrap">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border min-w-[200px]">Item</th>
                  <th className="p-2 border">Model</th>
                  <th className="p-2 border min-w-[200px]">Warehouse</th>
                  <th className="p-2 border min-w-[140px]">Rack</th>
                  <th className="p-2 border">Qty</th>
                  <th className="p-2 border">Action</th>
                  <th className="p-2 border">Purpose</th>
                  <th className="p-2 border min-w-[200px]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((entry) => (
                  <tr key={entry._id} className="border-t hover:bg-gray-50">
                    <td className="p-2 border">{formatDate(entry.date)}</td>
                    <td className="p-2 border">{entry.item?.name || "-"}</td>
                    <td className="p-2 border">{entry.item?.modelNo || "-"}</td>
                    <td className="p-2 border">{entry.warehouse?.name || "-"}</td>
                    <td className="p-2 border">{entry.locationDisplay || "-"}</td>
                    <td
                      className={`p-2 border text-center font-semibold ${
                        entry.quantity > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {entry.quantity}
                    </td>
                    <td className="p-2 border">{entry.action}</td>
                    <td className="p-2 border">{entry.purpose || "-"}</td>
                    <td className="p-2 border">{entry.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ✅ Responsive Pagination (NOT fixed) */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 bg-white p-3 rounded shadow">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white"
              }`}
            >
              Prev
            </button>

            {(() => {
              const { pages, showLeftEllipsis, showRightEllipsis } = getVisiblePages(
                totalPages,
                currentPage,
                8
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

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockLedger;
