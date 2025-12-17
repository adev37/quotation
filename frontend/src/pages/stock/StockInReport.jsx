import React, { useEffect, useMemo, useState } from "react";
import {
  useListStockInQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
} from "../../services/inventoryApi";

const StockInReport = () => {
  // RTK Query data
  const { data: stockIns = [], isLoading } = useListStockInQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: locations = [] } = useGetLocationsQuery();

  const [entries, setEntries] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;

  // hydrate when server data changes
  useEffect(() => {
    const data = Array.isArray(stockIns) ? stockIns : [];
    setEntries(data);
    setFiltered(data);
  }, [stockIns]);

  // unique companies (from items in stock-in entries)
  const companies = useMemo(
    () =>
      Array.from(
        new Set(
          (entries || [])
            .map((e) => e.item?.companyName)
            .filter(Boolean)
        )
      ),
    [entries]
  );

  // unique rack locations by name (like your previous logic)
  const uniqueRackLocations = useMemo(
    () => [...new Map((locations || []).map((l) => [l.name, l])).values()],
    [locations]
  );

  // apply filters
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
      data = data.filter((e) => e.location?._id === locationFilter);
    }

    if (companyFilter) {
      data = data.filter((e) => e.item?.companyName === companyFilter);
    }

    if (minQty) {
      data = data.filter((e) => e.quantity >= Number(minQty));
    }

    if (maxQty) {
      data = data.filter((e) => e.quantity <= Number(maxQty));
    }

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

  // pagination
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil((filtered.length || 0) / itemsPerPage) || 1;

  return (
    <div className="p-6 min-h-screen flex flex-col">
      <h2 className="text-2xl font-bold mb-4">📥 Stock In Report</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="🔍 Search Item / Model"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border px-3 py-2 rounded w-60"
        />

        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="border px-3 py-2 rounded w-60"
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
          className="border px-3 py-2 rounded w-60"
        >
          <option value="">📦 All Racks</option>
          {uniqueRackLocations.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="border px-3 py-2 rounded w-60"
        >
          <option value="">🏢 All Companies</option>
          {companies.map((c, idx) => (
            <option key={idx} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min Qty"
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          className="border px-3 py-2 rounded w-28"
        />

        <input
          type="number"
          placeholder="Max Qty"
          value={maxQty}
          onChange={(e) => setMaxQty(e.target.value)}
          className="border px-3 py-2 rounded w-28"
        />
      </div>

      {/* Table */}
      <div className="overflow-auto bg-white rounded shadow flex-1">
        {isLoading ? (
          <p className="p-6 text-blue-600">Loading Stock In...</p>
        ) : (
          <table className="min-w-full border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border whitespace-nowrap">Sl#</th>
                <th className="p-2 border whitespace-nowrap">Item</th>
                <th className="p-2 border whitespace-nowrap">Model</th>
                <th className="p-2 border whitespace-nowrap">Company</th>
                <th className="p-2 border whitespace-nowrap">Warehouse</th>
                <th className="p-2 border whitespace-nowrap">Rack</th>
                <th className="p-2 border whitespace-nowrap">Qty</th>
                <th className="p-2 border whitespace-nowrap">Date</th>
                <th className="p-2 border whitespace-nowrap">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((e, idx) => (
                <tr key={e._id || idx} className="border-t hover:bg-gray-50">
                  <td className="p-2 border whitespace-nowrap">
                    {indexOfFirst + idx + 1}
                  </td>
                  <td className="p-2 border whitespace-nowrap">{e.item?.name}</td>
                  <td className="p-2 border whitespace-nowrap">
                    {e.item?.modelNo}
                  </td>
                  <td className="p-2 border whitespace-nowrap">
                    {e.item?.companyName || "—"}
                  </td>
                  <td className="p-2 border whitespace-nowrap">
                    {e.warehouse?.name}
                  </td>
                  <td className="p-2 border whitespace-nowrap">
                    {e.location?.name || "—"}
                  </td>
                  <td className="p-2 border whitespace-nowrap">{e.quantity}</td>
                  <td className="p-2 border whitespace-nowrap">
                    {e.date
                      ? new Date(e.date).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="p-2 border whitespace-nowrap">
                    {e.remarks || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
          >
            ◀️ Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${
              currentPage === totalPages
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
          >
            Next ▶️
          </button>
        </div>
      )}
    </div>
  );
};

export default StockInReport;
