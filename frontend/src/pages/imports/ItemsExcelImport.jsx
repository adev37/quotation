// ItemsExcelImport.jsx
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import API from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { Download, Send, AlertTriangle } from "lucide-react";

const REQUIRED_HEADERS = [
  "Item Name",
  "Model No",
  "Company",
  "Min Stock Alert",
  "Category",
  "Unit",
  "Description",
];

const ItemsExcelImport = () => {
  const [rows, setRows] = useState([]);
  const [rawFile, setRawFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ NEW: server report
  const [report, setReport] = useState(null);

  const headerCheck = (headers) => {
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    return { ok: missing.length === 0, missing };
  };

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setRawFile(f);
    setReport(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (json.length === 0) {
          toast.error("❌ Sheet is empty.");
          setRows([]);
          return;
        }

        const incomingHeaders = Object.keys(json[0]);
        const { ok, missing } = headerCheck(incomingHeaders);
        if (!ok) {
          toast.error(`❌ Template mismatch. Missing: ${missing.join(", ")}`);
          setRows([]);
          return;
        }

        const normalized = json.map((r, i) => ({
          _row: i + 2, // Excel row number (header is row 1)
          name: String(r["Item Name"] || "").trim(),
          modelNo: String(r["Model No"] || "").trim(),
          companyName: String(r["Company"] || "").trim(),
          minStockAlert: String(r["Min Stock Alert"] ?? "").trim(),
          category: String(r["Category"] || "").trim(),
          unit: String(r["Unit"] || "").trim(),
          description: String(r["Description"] || "").trim(),
        }));

        setRows(normalized);
        toast.success("✅ File parsed. Click Import.");
      } catch (err) {
        console.error(err);
        toast.error("❌ Failed to parse Excel.");
        setRows([]);
      }
    };

    reader.readAsBinaryString(f);
  };

  const handleImport = async () => {
    if (rows.length === 0) return toast.error("❌ Nothing to import.");

    setLoading(true);
    try {
      const payload = rows.map((r) => ({
        _row: r._row, // ✅ important for line-number reporting
        name: r.name,
        modelNo: r.modelNo,
        companyName: r.companyName,
        minStockAlert: r.minStockAlert,
        category: r.category,
        unit: r.unit,
        description: r.description,
      }));

      const res = await API.post("/items/import", { items: payload });

      setReport(res.data);
      toast.success(res.data?.message || "✅ Import finished.");
      // You may keep rows or clear:
      // setRows([]);
      // setRawFile(null);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Import failed.";
      toast.error(`❌ ${msg}`);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadFormat = () => {
    const url = "/Items_Template.xlsx";
    const a = document.createElement("a");
    a.href = url;
    a.download = "Items_Template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ✅ NEW: download error report (xlsx)
  const downloadErrorReport = () => {
    if (!report?.results?.length) return;

    const rows = report.results.map((r) => ({
      "Excel Row": r.row,
      Status: r.status,
      Message: r.message,
      "Item Name": r.data?.name || "",
      "Model No": r.data?.modelNo || "",
      Company: r.data?.companyName || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import Report");
    XLSX.writeFile(wb, "Items_Import_Report.xlsx");
  };

  const preview = useMemo(() => rows.slice(0, 8), [rows]);

  const reportRows = report?.results || [];
  const hasReport = reportRows.length > 0;

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-5xl">
        <h2 className="text-2xl font-semibold text-blue-700 mb-6">
          Import Items (Excel)
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Excel File
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="w-full px-4 py-2 border border-gray-300 rounded"
          />
          {rawFile && (
            <p className="text-xs text-gray-500 mt-1">
              Selected: <b>{rawFile.name}</b>
            </p>
          )}
        </div>

        <div className="flex justify-between gap-4 mt-4">
          <button
            onClick={downloadFormat}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            type="button"
          >
            <Download className="w-4 h-4" />
            Download Format
          </button>

          <div className="flex gap-3">
            {hasReport && (
              <button
                onClick={downloadErrorReport}
                className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                type="button"
              >
                <AlertTriangle className="w-4 h-4" />
                Download Import Report
              </button>
            )}

            <button
              onClick={handleImport}
              disabled={rows.length === 0 || loading}
              className={`flex items-center gap-2 px-4 py-2 rounded ${
                rows.length > 0 && !loading
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 text-gray-700 cursor-not-allowed"
              }`}
              type="button"
            >
              <Send className="w-4 h-4" />
              {loading ? "Importing..." : "Import Items"}
            </button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-2 text-gray-800">
              Preview (first {preview.length} of {rows.length})
            </h3>

            <div className="overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 border">Excel Row</th>
                    <th className="px-2 py-1 border">Item</th>
                    <th className="px-2 py-1 border">Model</th>
                    <th className="px-2 py-1 border">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2 py-1 border">{r._row}</td>
                      <td className="px-2 py-1 border">{r.name}</td>
                      <td className="px-2 py-1 border">{r.modelNo}</td>
                      <td className="px-2 py-1 border">{r.companyName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              * Exact duplicates (Company + Model + Item Name) will be skipped.
            </p>
          </div>
        )}

        {hasReport && (
          <div className="mt-8">
            <h3 className="font-semibold text-gray-800 mb-2">
              Import Result (Row-wise)
            </h3>

            <div className="text-sm text-gray-700 mb-3">
              Imported: <b>{report.importedCount}</b> | Duplicates skipped:{" "}
              <b>{report.skippedDuplicatesCount}</b> | Errors:{" "}
              <b>{report.errorCount}</b>
            </div>

            <div className="overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 border">Excel Row</th>
                    <th className="px-2 py-1 border">Status</th>
                    <th className="px-2 py-1 border">Message</th>
                    <th className="px-2 py-1 border">Item</th>
                    <th className="px-2 py-1 border">Model</th>
                    <th className="px-2 py-1 border">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.slice(0, 200).map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-2 py-1 border">{r.row}</td>
                      <td className="px-2 py-1 border font-medium">{r.status}</td>
                      <td className="px-2 py-1 border">{r.message}</td>
                      <td className="px-2 py-1 border">{r.data?.name || ""}</td>
                      <td className="px-2 py-1 border">{r.data?.modelNo || ""}</td>
                      <td className="px-2 py-1 border">{r.data?.companyName || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Showing first 200 rows of the report. Use “Download Import Report”
              for full report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsExcelImport;
