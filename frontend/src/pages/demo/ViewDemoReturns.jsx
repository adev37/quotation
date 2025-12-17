// src/pages/demo/ViewDemoReturns.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useGetDemoReturnReportQuery } from "../../services/inventoryApi";

const ViewDemoReturns = () => {
  const { data: report = [], isLoading } = useGetDemoReturnReportQuery();

  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // sort newest first (by returnedOn if returned else by returnDate/createdAt)
  const sortedEntries = useMemo(() => {
    const arr = Array.isArray(report) ? [...report] : [];
    return arr.sort((a, b) => {
      const dA = new Date(a.returned ? a.returnedOn : (a.returnDate || a.createdAt));
      const dB = new Date(b.returned ? b.returnedOn : (b.returnDate || b.createdAt));
      return dB - dA;
    });
  }, [report]);

  const formatDate = (date) => {
    try {
      if (!date) return "-";
      const d = new Date(date);
      return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
    } catch {
      return "-";
    }
  };

  // filters
  const filteredEntries = useMemo(() => {
    let filtered = [...sortedEntries];

    if (statusFilter) {
      const wantReturned = statusFilter === "Returned";
      filtered = filtered.filter((e) => !!e.returned === wantReturned);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.itemName || "").toLowerCase().includes(q) ||
          (e.modelNo || "").toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      filtered = filtered.filter(
        (e) => e.returnDate && new Date(e.returnDate) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(
        (e) => e.returnDate && new Date(e.returnDate) <= new Date(dateTo)
      );
    }

    return filtered;
  }, [sortedEntries, statusFilter, searchText, dateFrom, dateTo]);

  useEffect(() => setCurrentPage(1), [statusFilter, searchText, dateFrom, dateTo]);

  const exportToExcel = () => {
    const data = filteredEntries.map((entry, idx) => ({
      "Sl#": idx + 1,
      Item: entry.itemName || "-",
      "Model No.": entry.modelNo || "-",
      "Total Qty": entry.quantity,
      "Returned Qty": entry.returnedQty,
      "Expected Return": formatDate(entry.returnDate),
      "Returned On": entry.returned ? formatDate(entry.returnedOn) : "-",
      Status: entry.returned ? "Returned" : "Pending",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demo Returns Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      "Demo_Returns_Report.xlsx"
    );
  };

  // pagination
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  return (
    <div className="p-6 min-h-screen relative pb-24">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
        Demo Returns Report
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔎 Search Item / Model"
          className="border px-3 py-2 rounded w-52"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded w-40"
        >
          <option value="">📌 All Status</option>
          <option value="Returned">Returned</option>
          <option value="Pending">Pending</option>
        </select>

        <label className="ml-2">Expected Return:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        <span>to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border px-2 py-1 rounded"
        />

        <button
          onClick={() => { setStatusFilter(""); setSearchText(""); setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          🔄 Reset
        </button>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          📄 Export to Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow rounded bg-white min-h-[400px]">
        {isLoading ? (
          <p className="p-6 text-blue-600">Loading demo returns...</p>
        ) : currentItems.length === 0 ? (
          <p className="p-6 text-gray-500">No demo return records found.</p>
        ) : (
          <table className="w-full table-auto border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Sl#</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Model No.</th>
                <th className="p-2 border">Total Qty</th>
                <th className="p-2 border">Returned Qty</th>
                <th className="p-2 border">Expected Return</th>
                <th className="p-2 border">Returned On</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((entry, idx) => (
                <tr key={entry._id || idx} className="border-t hover:bg-gray-50">
                  <td className="p-2 border text-center">{indexOfFirst + idx + 1}</td>
                  <td className="p-2 border text-center">{entry.itemName}</td>
                  <td className="p-2 border text-center">{entry.modelNo}</td>
                  <td className="p-2 border text-center">{entry.quantity}</td>
                  <td className="p-2 border text-center">{entry.returnedQty}</td>
                  <td className="p-2 border text-center">{formatDate(entry.returnDate)}</td>
                  <td className="p-2 border text-center">
                    {entry.returned ? formatDate(entry.returnedOn) : "-"}
                  </td>
                  <td className="p-2 border text-center">
                    <span
                      className={`font-semibold px-2 py-1 rounded ${
                        entry.returned ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
                      }`}
                    >
                      {entry.returned ? "Returned" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50 bg-white px-4 py-2 shadow rounded">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-3 py-1 rounded ${currentPage === 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white"}`}
          >
            ◀️ Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className={`px-3 py-1 rounded ${currentPage === totalPages ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white"}`}
          >
            Next ▶️
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewDemoReturns;
