// src/pages/demo/ViewDemoReturns.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useGetDemoReturnReportQuery } from "../../services/inventoryApi";

/** SAME pagination helper used in Item Master */
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

const ITEMS_PER_PAGE = 10;

const ViewDemoReturns = () => {
  const { data: report = [], isLoading, isError, error } =
    useGetDemoReturnReportQuery();

  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const formatDate = (date) => {
    try {
      if (!date) return "-";
      const d = new Date(date);
      return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
    } catch {
      return "-";
    }
  };

  // newest first
  const sortedEntries = useMemo(() => {
    const arr = Array.isArray(report) ? [...report] : [];
    return arr.sort((a, b) => {
      const dA = new Date(a.returned ? a.returnedOn : a.returnDate || a.createdAt);
      const dB = new Date(b.returned ? b.returnedOn : b.returnDate || b.createdAt);
      return dB - dA;
    });
  }, [report]);

  const filteredEntries = useMemo(() => {
    let filtered = [...sortedEntries];

    // status
    if (statusFilter) {
      const wantReturned = statusFilter === "Returned";
      filtered = filtered.filter((e) => !!e.returned === wantReturned);
    }

    // search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.itemName || "").toLowerCase().includes(q) ||
          (e.modelNo || "").toLowerCase().includes(q)
      );
    }

    // date range
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

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  const end = safePage * ITEMS_PER_PAGE;
  const currentItems = filteredEntries.slice(start, end);

  const resetFilters = () => {
    setStatusFilter("");
    setSearchText("");
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
                  📦
                </span>
                Demo Returns Report
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Filter by item/model, status and expected return date.
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
                onClick={resetFilters}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2"
                type="button"
              >
                ↻ Reset
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <TextInput
              type="text"
              placeholder="Search Item / Model"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Returned">Returned</option>
              <option value="Pending">Pending</option>
            </Select>

            <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

            {/* Total card */}
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm lg:col-span-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-slate-900">
                  {filteredEntries.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                Showing {currentItems.length} items
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
              Loading demo returns…
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
              Failed to load. {error?.data?.message || ""}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
              No demo return records found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">#</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Item</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Model No.</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Total Qty</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Returned Qty</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Expected Return</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Returned On</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.map((entry, idx) => (
                    <tr
                      key={entry._id || idx}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{start + idx + 1}</td>
                      <td className="px-4 py-3">{entry.itemName || "-"}</td>
                      <td className="px-4 py-3">{entry.modelNo || "-"}</td>
                      <td className="px-4 py-3 text-right">{entry.quantity ?? 0}</td>
                      <td className="px-4 py-3 text-right">{entry.returnedQty ?? 0}</td>
                      <td className="px-4 py-3">{formatDate(entry.returnDate)}</td>
                      <td className="px-4 py-3">
                        {entry.returned ? formatDate(entry.returnedOn) : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border",
                            entry.returned
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-100",
                          ].join(" ")}
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

        {/* ✅ Pagination SAME as Item Master (sticky bottom) */}
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
};

export default ViewDemoReturns;

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
