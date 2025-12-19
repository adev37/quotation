import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  useGetCurrentStockQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
} from "../../services/inventoryApi";

// helper: compute a sliding window of page numbers (default size 10)
const getVisiblePages = (total, current, windowSize = 10) => {
  if (total <= windowSize)
    return { pages: Array.from({ length: total }, (_, i) => i + 1) };

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

const CurrentStock = () => {
  const { data: stock = [], isLoading: stockLoading } = useGetCurrentStockQuery();
  const { data: warehouses = [], isLoading: whLoading } = useGetWarehousesQuery();
  const { data: allLocations = [], isLoading: locLoading } = useGetLocationsQuery();

  const [searchText, setSearchText] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 11;

  const companies = useMemo(
    () =>
      Array.from(new Set((stock || []).map((s) => s.companyName).filter(Boolean))),
    [stock]
  );

  const locations = useMemo(() => {
    const map = new Map();
    (allLocations || []).forEach((loc) => {
      const key = (loc.name || "").trim().toLowerCase();
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
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Current_Stock_Report.xlsx");
  };

  const loading = stockLoading || whLoading || locLoading;

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredStock.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil((filteredStock.length || 0) / itemsPerPage) || 1;

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="mx-auto w-full max-w-[1200px]">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">📊 Current Stock Report</h2>

        {/* ✅ Responsive Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search Item / Model / Company"
              className="border px-3 py-2 rounded w-full"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Warehouse</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Rack/Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="">All Racks/Locations</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="">All Companies</option>
              {companies.map((comp, i) => (
                <option key={i} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 lg:justify-end lg:col-span-6">
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

        {loading ? (
          <p className="text-blue-500">Loading stock data...</p>
        ) : currentItems.length === 0 ? (
          <p className="text-gray-600">No stock data found.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-[900px] w-full table-auto border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">S.No.</th>
                  <th className="p-2 border">Item</th>
                  <th className="p-2 border">Model</th>
                  <th className="p-2 border">Company</th>
                  <th className="p-2 border">Warehouse</th>
                  <th className="p-2 border">Rack/Location</th>
                  <th className="p-2 border">Qty</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((entry, index) => (
                  <tr
                    key={`${entry.itemId}-${entry.warehouseId}-${entry.location}-${index}`}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-2 border text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="p-2 border">{entry.item}</td>
                    <td className="p-2 border">{entry.modelNo}</td>
                    <td className="p-2 border">{entry.companyName}</td>
                    <td className="p-2 border">{entry.warehouse}</td>
                    <td className="p-2 border">{entry.location || "—"}</td>
                    <td
                      className={`p-2 border font-semibold ${
                        entry.quantity < 0
                          ? "text-red-500"
                          : entry.quantity === 0
                          ? "text-gray-500"
                          : "text-green-600"
                      }`}
                    >
                      {entry.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

export default CurrentStock;
