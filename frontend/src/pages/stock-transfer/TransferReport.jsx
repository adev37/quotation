import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  useGetTransfersQuery,
  useGetWarehousesQuery,
} from "../../services/inventoryApi";

const TransferReport = () => {
  const { data: transfers = [], isFetching } = useGetTransfersQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();

  const [searchText, setSearchText] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredTransfers = useMemo(() => {
    let rows = Array.isArray(transfers) ? transfers : [];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.item?.name?.toLowerCase().includes(q) ||
          t.item?.modelNo?.toLowerCase().includes(q)
      );
    }

    if (selectedWarehouse) {
      rows = rows.filter(
        (t) =>
          t.fromWarehouse?._id === selectedWarehouse ||
          t.toWarehouse?._id === selectedWarehouse
      );
    }

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
      Remarks: t.note || t.reason || "-", // support either field
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfer Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Transfer_Report.xlsx");
  };

  // pagination
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const pageRows = filteredTransfers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);

  return (
    <div className="p-6 min-h-screen relative pb-24">
      <h2 className="text-2xl font-bold mb-4">📋 Stock Transfer Report</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search Item or Model No."
          className="border px-3 py-2 rounded w-60"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="border px-3 py-2 rounded w-60"
        >
          <option value="">🏬 All Warehouses</option>
          {(warehouses || []).map((wh) => (
            <option key={wh._id} value={wh._id}>
              {wh.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearchText("");
            setSelectedWarehouse("");
            setCurrentPage(1);
          }}
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
      <div className="overflow-x-auto bg-white rounded shadow min-h-[400px]">
        {isFetching ? (
          <p className="p-6 text-blue-600">Loading transfers...</p>
        ) : pageRows.length === 0 ? (
          <p className="p-6 text-gray-500 italic">No transfer records found.</p>
        ) : (
          <table className="min-w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Model No.</th>
                <th className="p-2 border">Quantity</th>
                <th className="p-2 border">From</th>
                <th className="p-2 border">To</th>
                <th className="p-2 border">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t, i) => (
                <tr key={t._id} className="border-t hover:bg-gray-50">
                  <td className="p-2 border">{indexOfFirst + i + 1}</td>
                  <td className="p-2 border">
                    {moment(t.date).format("DD-MM-YYYY")}
                  </td>
                  <td className="p-2 border">{t.item?.name || "N/A"}</td>
                  <td className="p-2 border">{t.item?.modelNo || "-"}</td>
                  <td className="p-2 border">{t.quantity}</td>
                  <td className="p-2 border">{t.fromWarehouse?.name || "-"}</td>
                  <td className="p-2 border">{t.toWarehouse?.name || "-"}</td>
                  <td className="p-2 border">{t.note || t.reason || "-"}</td>
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
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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

export default TransferReport;
