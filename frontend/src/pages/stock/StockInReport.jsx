// src/pages/stock/StockInReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  useListStockInQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
} from "../../services/inventoryApi";

const StockInReport = () => {
  const { data: stockIns = [], isLoading } = useListStockInQuery();
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
  const itemsPerPage = 11;

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
  }, [entries, searchText, warehouseFilter, locationFilter, companyFilter, minQty, maxQty]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil((filtered.length || 0) / itemsPerPage) || 1;

  return (
    <div className="w-full">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                📥 Stock In Report
              </h2>
              <p className="text-sm text-slate-500">
                Filters are responsive. Table scrolls horizontally on mobile.
              </p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
              <input
                type="text"
                placeholder="🔍 Search Item / Model"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />

              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">🏬 All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">📦 All Racks</option>
                {uniqueRackNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">🏢 All Companies</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Min Qty"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />

              <input
                type="number"
                placeholder="Max Qty"
                value={maxQty}
                onChange={(e) => setMaxQty(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto rounded-xl border">
              {isLoading ? (
                <p className="p-4 text-indigo-600">Loading Stock In...</p>
              ) : currentItems.length === 0 ? (
                <p className="p-4 text-slate-500">No records found.</p>
              ) : (
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-semibold">
                    <tr>
                      <th className="px-3 py-2 border-b text-left whitespace-nowrap">Sl#</th>
                      <th className="px-3 py-2 border-b text-left whitespace-nowrap">Item</th>
                      <th className="px-3 py-2 border-b text-left whitespace-nowrap">Model</th>
                      <th className="px-3 py-2 border-b text-left whitespace-nowrap">Company</th>
                      <th className="px-3 py-2 border-b text-left whitespace-nowrap">Warehouse</th>
                      <th className="px-3 py-2 border-b text-left whitespace-nowrap">Rack</th>
                      <th className="px-3 py-2 border-b text-right whitespace-nowrap">Qty</th>
                      <th className="px-3 py-2 border-b text-left whitespace-nowrap">Date</th>
                      <th className="px-3 py-2 border-b text-left whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentItems.map((e, idx) => (
                      <tr key={e._id || idx} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {indexOfFirst + idx + 1}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{e.item?.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{e.item?.modelNo}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {e.item?.companyName || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{e.warehouse?.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{e.location?.name || "—"}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{e.quantity}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {e.date ? new Date(e.date).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{e.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    currentPage === 1
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  ◀ Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      currentPage === i + 1
                        ? "bg-indigo-700 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    currentPage === totalPages
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockInReport;
