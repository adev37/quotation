import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import API from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { Download, Send, AlertTriangle } from "lucide-react";

const REQUIRED_HEADERS = ["Model", "Item", "Warehouse", "Rack", "Quantity", "Date", "Remarks"];

const StockInExcelImport = () => {
  const [rows, setRows] = useState([]);
  const [rawFile, setRawFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ server report like Items import
  const [report, setReport] = useState(null);

  const headerCheck = (headers) => {
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    return { ok: missing.length === 0, missing };
  };

  // robust Excel date -> yyyy-mm-dd (string)
  const parseExcelDate = (value) => {
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    if (typeof value === "number") {
      const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
      return utc;
    }

    if (typeof value === "string") {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  };

  const formatISODateOnly = (date) => date.toISOString().split("T")[0];

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setRawFile(f);
    setReport(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: true });
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
          toast.error(`❌ Template mismatch. Missing columns: ${missing.join(", ")}`);
          setRows([]);
          return;
        }

        const normalized = json.map((r, i) => {
          const qty = Number(r["Quantity"]);
          const dt = parseExcelDate(r["Date"]);

          return {
            _row: i + 2,
            model: String(r["Model"] || "").trim(),
            item: String(r["Item"] || "").trim(),
            warehouse: String(r["Warehouse"] || "").trim(),
            location: String(r["Rack"] || "").trim(),
            quantity: Number.isFinite(qty) ? qty : NaN,
            date: dt,
            remarks: String(r["Remarks"] || "").trim(),
          };
        });

        setRows(normalized);
        toast.success("✅ File parsed. Click Import Stock In.");
      } catch (err) {
        console.error(err);
        toast.error("❌ Failed to parse Excel file.");
        setRows([]);
      }
    };

    reader.readAsBinaryString(f);
  };

  const handleImport = async () => {
    if (rows.length === 0) return toast.error("❌ Nothing to import.");

    // basic validation (client-side)
    const bad = rows.find(
      (r) =>
        !r.item ||
        !r.warehouse ||
        !Number.isFinite(r.quantity) ||
        r.quantity <= 0 ||
        !r.date
    );
    if (bad) {
      return toast.error(`❌ Invalid data at Excel row ${bad._row}. Check Item/Warehouse/Qty/Date.`);
    }

    setLoading(true);
    try {
      // ✅ Send RAW values (backend resolves names + gives report)
      const payload = rows.map((r) => ({
        _row: r._row,
        item: r.item,                 // can be name or ObjectId
        model: r.model || "",         // optional fallback
        warehouse: r.warehouse,       // can be name or ObjectId
        location: r.location || "",   // optional name or ObjectId
        quantity: r.quantity,
        date: formatISODateOnly(r.date),
        remarks: r.remarks || "",
      }));

      const res = await API.post("/stock-in", { items: payload });

      setReport(res.data);
      toast.success(res.data?.message || "✅ Import finished.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Import failed.";
      toast.error(`❌ ${msg}`);
      setReport(err?.response?.data || null); // even on 400 we want report
    } finally {
      setLoading(false);
    }
  };

  const downloadFormat = () => {
    const url = "/StockIn_Template.xlsx";
    const a = document.createElement("a");
    a.href = url;
    a.download = "StockIn_Template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadImportReport = () => {
    if (!report?.results?.length) return;

    const data = report.results.map((r) => ({
      "Excel Row": r.row,
      Status: r.status,
      Message: r.message,
      Item: r.data?.item || "",
      Model: r.data?.model || "",
      Warehouse: r.data?.warehouse || "",
      Rack: r.data?.rack || "",
      Quantity: r.data?.quantity ?? "",
      Date: r.data?.date || "",
      Remarks: r.data?.remarks || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StockIn Import Report");
    XLSX.writeFile(wb, "StockIn_Import_Report.xlsx");
  };

  const preview = useMemo(() => rows.slice(0, 8), [rows]);

  const reportRows = report?.results || [];
  const hasReport = reportRows.length > 0;

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-6xl">
        <h2 className="text-2xl font-semibold text-blue-700 mb-6">
          Import Stock In (Excel)
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
                onClick={downloadImportReport}
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
              {loading ? "Importing..." : "Import Stock In"}
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
                    <th className="px-2 py-1 border">Warehouse</th>
                    <th className="px-2 py-1 border">Rack</th>
                    <th className="px-2 py-1 border">Qty</th>
                    <th className="px-2 py-1 border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2 py-1 border">{r._row}</td>
                      <td className="px-2 py-1 border">{r.item}</td>
                      <td className="px-2 py-1 border">{r.warehouse}</td>
                      <td className="px-2 py-1 border">{r.location || "-"}</td>
                      <td className="px-2 py-1 border">
                        {Number.isFinite(r.quantity) ? r.quantity : "⚠️"}
                      </td>
                      <td className="px-2 py-1 border">
                        {r.date ? formatISODateOnly(r.date) : "⚠️"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <th className="px-2 py-1 border">Warehouse</th>
                    <th className="px-2 py-1 border">Rack</th>
                    <th className="px-2 py-1 border">Qty</th>
                    <th className="px-2 py-1 border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.slice(0, 200).map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-2 py-1 border">{r.row}</td>
                      <td className="px-2 py-1 border font-medium">{r.status}</td>
                      <td className="px-2 py-1 border">{r.message}</td>
                      <td className="px-2 py-1 border">{r.data?.item || ""}</td>
                      <td className="px-2 py-1 border">{r.data?.warehouse || ""}</td>
                      <td className="px-2 py-1 border">{r.data?.rack || ""}</td>
                      <td className="px-2 py-1 border">{r.data?.quantity ?? ""}</td>
                      <td className="px-2 py-1 border">{r.data?.date || ""}</td>
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

export default StockInExcelImport;
