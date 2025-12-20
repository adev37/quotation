/* ================================
   ✅ CurrentStock.jsx (UPDATED)
   - Pagination UI SAME as Item Master (sticky + sliding window + ellipsis)
   - Filters + Header style upgraded to match Item Master look
=================================== */

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  useGetCurrentStockQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
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

export default function CurrentStock() {
  const { data: stock = [], isLoading: stockLoading } = useGetCurrentStockQuery();
  const { data: warehouses = [], isLoading: whLoading } = useGetWarehousesQuery();
  const { data: allLocations = [], isLoading: locLoading } = useGetLocationsQuery();

  const [searchText, setSearchText] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const companies = useMemo(
    () =>
      Array.from(new Set((stock || []).map((s) => s.companyName).filter(Boolean))),
    [stock]
  );

  // unique rack names (case-insensitive)
  const locations = useMemo(() => {
    const map = new Map();
    (allLocations || []).forEach((loc) => {
      const key = (loc.name || "").trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, loc);
    });
    return Array.from(map.values());
  }, [allLocations]);

  const filteredStock = useMemo(() => {
    let filtered = Array.isArray(stock) ? [...stock] : [];
    const lower = (searchText || "").toLowerCase();

    if (lower) {
      filtered = filtered.filter(
        (entry) =>
          (entry.item || "").toLowerCase().includes(lower) ||
          (entry.modelNo || "").toLowerCase().includes(lower) ||
          (entry.companyName || "").toLowerCase().includes(lower)
      );
    }

    if (selectedWarehouse) {
      filtered = filtered.filter((entry) => entry.warehouseId === selectedWarehouse);
    }

    if (selectedLocation) {
      const locName = locations.find((l) => l._id === selectedLocation)?.name;
      if (locName) {
        filtered = filtered.filter(
          (entry) => (entry.location || "").toLowerCase() === locName.toLowerCase()
        );
      }
    }

    if (selectedCompany) {
      filtered = filtered.filter((entry) => entry.companyName === selectedCompany);
    }

    return filtered;
  }, [stock, searchText, selectedWarehouse, selectedLocation, selectedCompany, locations]);

  const handleReset = () => {
    setSearchText("");
    setSelectedWarehouse("");
    setSelectedLocation("");
    setSelectedCompany("");
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    const data = filteredStock.map((entry, index) => ({
      "S.No.": index + 1,
      Item: entry.item,
      "Model No.": entry.modelNo,
      Company: entry.companyName,
      Warehouse: entry.warehouse,
      Location: entry.location || "",
      Quantity: entry.quantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Current Stock");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "Current_Stock_Report.xlsx"
    );
  };

  const loading = stockLoading || whLoading || locLoading;

  const totalPages = Math.ceil((filteredStock.length || 0) / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const indexOfLast = safePage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredStock.slice(indexOfFirst, indexOfLast);

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header (Item Master style) */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  📊
                </span>
                Current Stock Report
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Filter current stock by warehouse, rack, and company.
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

          {/* Filters (Item Master look) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <TextInput
              type="text"
              placeholder="Search Item / Model / Company"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />

            <Select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Racks/Locations</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          {/* Total card */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-slate-900">
                  {filteredStock.length}
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
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
              Loading stock data...
            </div>
          ) : currentItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 text-sm">
              No stock data found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">S.No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Item</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Model</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Company</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Warehouse</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Rack/Location</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((entry, index) => (
                    <tr
                      key={`${entry.itemId}-${entry.warehouseId}-${entry.location}-${index}`}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {indexOfFirst + index + 1}
                      </td>
                      <td className="px-4 py-3">{entry.item}</td>
                      <td className="px-4 py-3">{entry.modelNo}</td>
                      <td className="px-4 py-3">{entry.companyName}</td>
                      <td className="px-4 py-3">{entry.warehouse}</td>
                      <td className="px-4 py-3">{entry.location || "—"}</td>
                      <td
                        className={[
                          "px-4 py-3 text-right font-semibold",
                          entry.quantity < 0
                            ? "text-rose-600"
                            : entry.quantity === 0
                            ? "text-slate-500"
                            : "text-emerald-700",
                        ].join(" ")}
                      >
                        {entry.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ✅ Pagination SAME AS Item Master (sticky + pages + ellipsis) */}
        {filteredStock.length > 0 && totalPages > 1 ? (
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
