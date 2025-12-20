/* ================================
   ✅ StockLedger.jsx (UPDATED)
   - Pagination UI SAME as Item Master (sticky + sliding window + ellipsis)
   - Filters + Header style upgraded to match Item Master look
=================================== */

import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useGetLedgerQuery } from "../../services/inventoryApi";

/** SAME PAGINATION LOGIC AS Item Master (sliding window) */
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

export default function StockLedger() {
  const { data: ledger = [], isLoading } = useGetLedgerQuery();

  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [actionType, setActionType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const sorted = [...(ledger || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
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
    saveAs(
      new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "Stock_Ledger.xlsx"
    );
  };

  const totalPages = Math.ceil((filteredEntries.length || 0) / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const indexOfLast = safePage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirst, indexOfLast);

  const handleReset = () => {
    setSearchText("");
    setActionType("");
    setPurpose("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  📒
                </span>
                Stock Ledger
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Search and filter ledger entries. Table scrolls horizontally on mobile.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                onClick={exportToExcel}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2"
                type="button"
              >
                📄 Export
              </button>
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2"
                type="button"
              >
                ↻ Reset
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <TextInput
              type="text"
              placeholder="Item / Model / Warehouse"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Select value={actionType} onChange={(e) => setActionType(e.target.value)}>
              <option value="">All Actions</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </Select>

            <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              <option value="">All Purposes</option>
              {allPurposes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>

            <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-slate-900">{filteredEntries.length}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                Showing {currentItems.length} items
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="overflow-x-auto w-full rounded-2xl border border-slate-200">
            {isLoading ? (
              <div className="p-6 text-sm text-indigo-700">Loading ledger...</div>
            ) : currentItems.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">No records found.</div>
            ) : (
              <table className="min-w-[1100px] w-full text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-left">Warehouse</th>
                    <th className="px-4 py-3 text-left">Rack</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Purpose</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((entry) => (
                    <tr key={entry._id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3">{entry.item?.name || "-"}</td>
                      <td className="px-4 py-3">{entry.item?.modelNo || "-"}</td>
                      <td className="px-4 py-3">{entry.warehouse?.name || "-"}</td>
                      <td className="px-4 py-3">{entry.locationDisplay || "-"}</td>
                      <td
                        className={[
                          "px-4 py-3 text-right font-semibold",
                          Number(entry.quantity) > 0 ? "text-emerald-700" : "text-rose-600",
                        ].join(" ")}
                      >
                        {entry.quantity}
                      </td>
                      <td className="px-4 py-3">{entry.action}</td>
                      <td className="px-4 py-3">{entry.purpose || "-"}</td>
                      <td className="px-4 py-3">{entry.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ✅ Pagination SAME AS Item Master */}
        {filteredEntries.length > 0 && totalPages > 1 ? (
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

/* ---------- UI helpers (same as Item Master) ---------- */
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

function Select({ className = "", children, ...props }) {
  return (
    <select
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </select>
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
