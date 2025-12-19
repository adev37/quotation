import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useGetDemoReturnReportQuery } from "../../services/inventoryApi";

const ViewDemoReturns = () => {
  const { data: report = [], isLoading, isError, error } =
    useGetDemoReturnReportQuery();

  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatDate = (date) => {
    try {
      if (!date) return "-";
      const d = new Date(date);
      return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
    } catch {
      return "-";
    }
  };

  // sort newest first
  const sortedEntries = useMemo(() => {
    const arr = Array.isArray(report) ? [...report] : [];
    return arr.sort((a, b) => {
      const dA = new Date(a.returned ? a.returnedOn : a.returnDate || a.createdAt);
      const dB = new Date(b.returned ? b.returnedOn : b.returnDate || b.createdAt);
      return dB - dA;
    });
  }, [report]);

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
      "Total Qty": entry.quantity ?? 0,
      "Returned Qty": entry.returnedQty ?? 0,
      "Expected Return": formatDate(entry.returnDate),
      "Returned On": entry.returned ? formatDate(entry.returnedOn) : "-",
      Status: entry.returned ? "Returned" : "Pending",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demo Returns Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "Demo_Returns_Report.xlsx"
    );
  };

  // pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const indexOfLast = safePage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirst, indexOfLast);

  const resetFilters = () => {
    setStatusFilter("");
    setSearchText("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  Demo Returns Report
                </h2>
                <p className="text-sm text-slate-500">
                  Filter by item/model, status and expected return date.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50"
                >
                  🔄 Reset
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                >
                  📄 Export
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="🔎 Search Item / Model"
                className="border rounded-lg px-3 py-2 text-sm w-full"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="">📌 All Status</option>
                <option value="Returned">Returned</option>
                <option value="Pending">Pending</option>
              </select>

              <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  From
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm w-full outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  To
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm w-full outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Table */}
            <div className="mt-4">
              {isLoading ? (
                <div className="text-blue-600 text-sm">Loading demo returns…</div>
              ) : isError ? (
                <div className="text-red-600 text-sm">
                  Failed to load. {error?.data?.message || ""}
                </div>
              ) : currentItems.length === 0 ? (
                <div className="text-slate-500 text-sm">
                  No demo return records found.
                </div>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border">
                  <table className="min-w-[950px] w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-3 text-left whitespace-nowrap">Sl#</th>
                        <th className="p-3 text-left whitespace-nowrap">Item</th>
                        <th className="p-3 text-left whitespace-nowrap">Model No.</th>
                        <th className="p-3 text-right whitespace-nowrap">Total Qty</th>
                        <th className="p-3 text-right whitespace-nowrap">Returned Qty</th>
                        <th className="p-3 text-left whitespace-nowrap">Expected Return</th>
                        <th className="p-3 text-left whitespace-nowrap">Returned On</th>
                        <th className="p-3 text-center whitespace-nowrap">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentItems.map((entry, idx) => (
                        <tr
                          key={entry._id || idx}
                          className="border-t hover:bg-slate-50"
                        >
                          <td className="p-3">
                            {indexOfFirst + idx + 1}
                          </td>
                          <td className="p-3">{entry.itemName || "-"}</td>
                          <td className="p-3">{entry.modelNo || "-"}</td>
                          <td className="p-3 text-right">{entry.quantity ?? 0}</td>
                          <td className="p-3 text-right">{entry.returnedQty ?? 0}</td>
                          <td className="p-3">{formatDate(entry.returnDate)}</td>
                          <td className="p-3">
                            {entry.returned ? formatDate(entry.returnedOn) : "-"}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                entry.returned
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {entry.returned ? "Returned" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination (sticky, responsive) */}
            {filteredEntries.length > 0 && totalPages > 1 && (
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
              Mobile tip: Filters auto-wrap. Table is scrollable horizontally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDemoReturns;
