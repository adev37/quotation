// src/pages/stock/StockInReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  useListStockInQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
} from "../../services/inventoryApi";

/**
 * Sliding window pages (same as ItemList)
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

const ITEMS_PER_PAGE = 7;

export default function StockInReport() {
  const { data: stockIns = [], isLoading, isError, error } = useListStockInQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: locations = [] } = useGetLocationsQuery();

  const [entries, setEntries] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState(""); // rack NAME
  const [companyFilter, setCompanyFilter] = useState("");
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const data = Array.isArray(stockIns) ? stockIns : [];
    setEntries(data);
    setFiltered(data);
  }, [stockIns]);

  const companies = useMemo(() => {
    return Array.from(
      new Set((entries || []).map((e) => e.item?.companyName).filter(Boolean))
    );
  }, [entries]);

  // unique rack names (case-insensitive), sorted
  const uniqueRackNames = useMemo(() => {
    const map = new Map();
    (locations || []).forEach((l) => {
      const key = String(l.name || "").trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, String(l.name || "").trim());
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [locations]);

  useEffect(() => {
    let data = [...entries];
    const q = (searchText || "").toLowerCase();

    if (q) {
      data = data.filter(
        (e) =>
          e.item?.name?.toLowerCase().includes(q) ||
          e.item?.modelNo?.toLowerCase().includes(q)
      );
    }

    if (warehouseFilter) {
      data = data.filter((e) => e.warehouse?._id === warehouseFilter);
    }

    if (locationFilter) {
      const wanted = locationFilter.trim().toLowerCase();
      data = data.filter(
        (e) => (e.location?.name || "").trim().toLowerCase() === wanted
      );
    }

    if (companyFilter) {
      data = data.filter((e) => e.item?.companyName === companyFilter);
    }

    if (minQty) data = data.filter((e) => e.quantity >= Number(minQty));
    if (maxQty) data = data.filter((e) => e.quantity <= Number(maxQty));

    setFiltered(data);
    setCurrentPage(1);
  }, [
    entries,
    searchText,
    warehouseFilter,
    locationFilter,
    companyFilter,
    minQty,
    maxQty,
  ]);

  const totalPages = Math.ceil((filtered.length || 0) / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const indexOfFirst = (safePage - 1) * ITEMS_PER_PAGE;
  const indexOfLast = indexOfFirst + ITEMS_PER_PAGE;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header (same card style as ItemList) */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  📥
                </span>
                Stock In Report
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Use filters to find entries. Table scrolls on mobile.
              </p>
            </div>

            {/* Total Box (same look as ItemList) */}
            <div className="w-full sm:w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-slate-900">{filtered.length}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                Showing {currentItems.length} items
              </div>
            </div>
          </div>

          {/* Filters (same input style) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <TextInput
              type="text"
              placeholder="Search Item / Model"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </Select>

            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All Racks</option>
              {uniqueRackNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>

            <Select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>

            <TextInput
              type="number"
              placeholder="Min Qty"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
            />

            <TextInput
              type="number"
              placeholder="Max Qty"
              value={maxQty}
              onChange={(e) => setMaxQty(e.target.value)}
            />
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
              No records found.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-3 py-3 border-b text-left whitespace-nowrap">Sl#</th>
                    <th className="px-3 py-3 border-b text-left whitespace-nowrap">Item</th>
                    <th className="px-3 py-3 border-b text-left whitespace-nowrap">Model</th>
                    <th className="px-3 py-3 border-b text-left whitespace-nowrap">Company</th>
                    <th className="px-3 py-3 border-b text-left whitespace-nowrap">Warehouse</th>
                    <th className="px-3 py-3 border-b text-left whitespace-nowrap">Rack</th>
                    <th className="px-3 py-3 border-b text-right whitespace-nowrap">Qty</th>
                    <th className="px-3 py-3 border-b text-left whitespace-nowrap">Date</th>
                    <th className="px-3 py-3 border-b text-left whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.map((e, idx) => (
                    <tr
                      key={e._id || idx}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        {indexOfFirst + idx + 1}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{e.item?.name || "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{e.item?.modelNo || "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {e.item?.companyName || "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{e.warehouse?.name || "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{e.location?.name || "—"}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">{e.quantity ?? 0}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {e.date ? new Date(e.date).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{e.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination (SAME as ItemList: sticky bottom + page window + ellipsis, hidden on mobile) */}
        {filtered.length > 0 && totalPages > 1 ? (
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

                  {/* Page numbers (desktop only like ItemList) */}
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

/* ---------- UI helpers (same as ItemList) ---------- */
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

function TableSkeleton() {
  return (
    <div>
      <div className="h-4 w-44 bg-slate-100 rounded animate-pulse" />
      <div className="mt-3 h-28 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="mt-3 h-28 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );
}
