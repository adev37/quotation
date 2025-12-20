// src/pages/transfers/TransferReport.jsx
import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  useGetTransfersQuery,
  useGetWarehousesQuery,
} from "../../services/inventoryApi";

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

const ITEMS_PER_PAGE = 10;

export default function TransferReport() {
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
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "Transfer_Report.xlsx"
    );
  };

  // pagination
  const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const indexOfLast = safePage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const pageRows = filteredTransfers.slice(indexOfFirst, indexOfLast);

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header (same style like Item Master) */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  📋
                </span>
                Stock Transfer Report
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Filter and export transfers. Table scrolls horizontally on mobile.
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
                onClick={() => {
                  setSearchText("");
                  setSelectedWarehouse("");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2"
                type="button"
              >
                ↻ Reset
              </button>
            </div>
          </div>

          {/* Filters + Total card (like Item Master) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <TextInput
              type="text"
              placeholder="Search item / model"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {(warehouses || []).map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </Select>

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-slate-900">
                  {filteredTransfers.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                Showing {pageRows.length} items
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="mt-0 w-full overflow-x-auto rounded-2xl border border-slate-200">
            {isFetching ? (
              <div className="p-5 text-sm text-indigo-700">Loading transfers...</div>
            ) : pageRows.length === 0 ? (
              <div className="p-5 text-sm text-slate-600">No transfer records found.</div>
            ) : (
              <table className="min-w-[1050px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                  <tr>
                    <th className="px-4 py-3 border-b whitespace-nowrap">#</th>
                    <th className="px-4 py-3 border-b whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 border-b whitespace-nowrap">Item</th>
                    <th className="px-4 py-3 border-b whitespace-nowrap">Model No.</th>
                    <th className="px-4 py-3 border-b whitespace-nowrap">Qty</th>
                    <th className="px-4 py-3 border-b whitespace-nowrap">From</th>
                    <th className="px-4 py-3 border-b whitespace-nowrap">To</th>
                    <th className="px-4 py-3 border-b whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((t, i) => (
                    <tr
                      key={t._id || i}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">{indexOfFirst + i + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {moment(t.date).format("DD-MM-YYYY")}
                      </td>
                      <td className="px-4 py-3">{t.item?.name || "N/A"}</td>
                      <td className="px-4 py-3">{t.item?.modelNo || "-"}</td>
                      <td className="px-4 py-3">{t.quantity}</td>
                      <td className="px-4 py-3">{t.fromWarehouse?.name || "-"}</td>
                      <td className="px-4 py-3">{t.toWarehouse?.name || "-"}</td>
                      <td className="px-4 py-3">{t.note || t.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination (EXACT STYLE + SLIDING WINDOW like Item Master) */}
        {filteredTransfers.length > 0 && totalPages > 1 ? (
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
