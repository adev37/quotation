// src/pages/stock/AddStockOut.jsx
import React, { useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useLazyGetRackOptionsQuery,
  useCreateStockOutMutation,
} from "../../services/inventoryApi";

const emptyRow = { item: "", warehouse: "", location: "", quantity: "" };

const AddStockOut = () => {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: allWarehouses = [] } = useGetWarehousesQuery();
  const [createStockOut, { isLoading }] = useCreateStockOutMutation();
  const [triggerRackOptions] = useLazyGetRackOptionsQuery();

  const allItems = Array.isArray(itemsResult)
    ? itemsResult
    : Array.isArray(itemsResult?.items)
    ? itemsResult.items
    : [];

  const [rows, setRows] = useState([emptyRow]);

  // per-row search UI
  const [itemSearch, setItemSearch] = useState([""]);
  const [itemSuggestions, setItemSuggestions] = useState([[]]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);

  const suggestionWrapRef = useRef(null);

  // rack options per row: { [idx]: [{locationId, location, quantity}] }
  const [rackOptions, setRackOptions] = useState({});

  const [purpose, setPurpose] = useState("");
  const [reason, setReason] = useState("");
  const [tenderNo, setTenderNo] = useState("");
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // close suggestions when click outside
  useEffect(() => {
    const onDown = (e) => {
      if (!suggestionWrapRef.current) return;
      if (!suggestionWrapRef.current.contains(e.target)) {
        setActiveSuggestionIdx(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const updateRow = (idx, patch) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const fetchRackOptions = async (index, item, warehouse) => {
    try {
      const data = await triggerRackOptions({ item, warehouse }).unwrap();
      const valid = (data || []).filter((x) => Number(x.quantity) > 0);
      setRackOptions((prev) => ({ ...prev, [index]: valid }));
    } catch (err) {
      console.error("Rack fetch error:", err);
      toast.error(err?.data?.message || "Failed to fetch rack options");
      setRackOptions((prev) => ({ ...prev, [index]: [] }));
    }
  };

  const handleWarehouseChange = (idx, warehouseId) => {
    updateRow(idx, { warehouse: warehouseId, location: "" });
    setRackOptions((prev) => ({ ...prev, [idx]: [] }));

    const itemId = rows[idx].item;
    if (itemId && warehouseId) fetchRackOptions(idx, itemId, warehouseId);
  };

  const handleRackChange = (idx, locationId) => updateRow(idx, { location: locationId });
  const handleQtyChange = (idx, qty) => updateRow(idx, { quantity: qty });

  const handleItemSearchChange = (idx, value) => {
    setActiveSuggestionIdx(idx);

    setItemSearch((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });

    // clear selected item while typing
    updateRow(idx, { item: "", location: "" });
    setRackOptions((prev) => ({ ...prev, [idx]: [] }));

    const q = value.trim().toLowerCase();
    if (!q) {
      setItemSuggestions((prev) => {
        const next = [...prev];
        next[idx] = [];
        return next;
      });
      return;
    }

    const filtered = allItems
      .filter((i) => {
        const n = (i.name || "").toLowerCase();
        const m = (i.modelNo || "").toLowerCase();
        return n.includes(q) || m.includes(q);
      })
      .slice(0, 20);

    setItemSuggestions((prev) => {
      const next = [...prev];
      next[idx] = filtered;
      return next;
    });
  };

  const handleSelectSuggestion = (idx, suggestion) => {
    updateRow(idx, { item: suggestion._id, location: "" });

    setItemSearch((prev) => {
      const next = [...prev];
      next[idx] = `${suggestion.name} (${suggestion.modelNo || "—"})`;
      return next;
    });

    setItemSuggestions((prev) => {
      const next = [...prev];
      next[idx] = [];
      return next;
    });
    setActiveSuggestionIdx(null);

    const wh = rows[idx].warehouse;
    if (wh) fetchRackOptions(idx, suggestion._id, wh);
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow]);
    setItemSearch((prev) => [...prev, ""]);
    setItemSuggestions((prev) => [...prev, []]);
  };

  const removeRow = (idx) => {
    if (rows.length <= 1) return;

    setRows((prev) => prev.filter((_, i) => i !== idx));
    setItemSearch((prev) => prev.filter((_, i) => i !== idx));
    setItemSuggestions((prev) => prev.filter((_, i) => i !== idx));

    setRackOptions((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });

    if (activeSuggestionIdx === idx) setActiveSuggestionIdx(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.item) return toast.error(`Row ${i + 1}: Select item`);
      if (!r.warehouse) return toast.error(`Row ${i + 1}: Select warehouse`);
      if (!r.location) return toast.error(`Row ${i + 1}: Select rack/location`);
      if (!r.quantity || Number(r.quantity) <= 0) return toast.error(`Row ${i + 1}: Enter valid quantity`);
    }

    if (!purpose) return toast.error("Select purpose");
    if (!date) return toast.error("Select stock out date");
    if (!reason) return toast.error("Enter reason");

    if (purpose === "Demo" && !returnDate) return toast.error("Select expected return date");

    try {
      await createStockOut({
        items: rows.map((r) => ({
          item: r.item,
          warehouse: r.warehouse,
          location: r.location,
          quantity: Number(r.quantity),
        })),
        purpose,
        reason,
        tenderNo,
        date,
        returnDate: purpose === "Demo" ? returnDate : null,
      }).unwrap();

      toast.success("✅ Stock Out saved");
      setRows([emptyRow]);
      setItemSearch([""]);
      setItemSuggestions([[]]);
      setRackOptions({});
      setActiveSuggestionIdx(null);

      setPurpose("");
      setReason("");
      setTenderNo("");
      setDate("");
      setReturnDate("");
    } catch (err) {
      toast.error(err?.data?.message || "❌ Stock Out failed");
    }
  };

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={4000} theme="colored" />

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                📤 Stock Out
              </h2>
              <p className="text-sm text-slate-500">
                Select rack based on available stock. On mobile, fields stack automatically.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" ref={suggestionWrapRef}>
              {rows.map((r, idx) => (
                <div key={idx} className="rounded-xl border p-3 sm:p-4 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-800">Item Row #{idx + 1}</div>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Search Item */}
                    <div className="md:col-span-5 relative min-w-0">
                      <label className="block mb-1 text-sm font-medium text-slate-700">
                        Search Item <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemSearch[idx] || ""}
                        onChange={(e) => handleItemSearchChange(idx, e.target.value)}
                        onFocus={() => (itemSearch[idx] || "").trim() && setActiveSuggestionIdx(idx)}
                        placeholder="Type item name / model"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        autoComplete="off"
                        required
                      />

                      {activeSuggestionIdx === idx && (itemSuggestions[idx] || []).length > 0 && (
                        <ul className="absolute z-20 mt-1 bg-white border rounded-xl shadow w-full max-h-56 overflow-auto">
                          {itemSuggestions[idx].map((s) => (
                            <li
                              key={s._id}
                              className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm"
                              onClick={() => handleSelectSuggestion(idx, s)}
                            >
                              <div className="font-medium text-slate-900">{s.name}</div>
                              <div className="text-xs text-slate-500">{s.modelNo || "-"}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Warehouse */}
                    <div className="md:col-span-3 min-w-0">
                      <label className="block mb-1 text-sm font-medium text-slate-700">
                        Warehouse <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={r.warehouse}
                        onChange={(e) => handleWarehouseChange(idx, e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        required
                      >
                        <option value="">Select Warehouse</option>
                        {(allWarehouses || []).map((w) => (
                          <option key={w._id} value={w._id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rack */}
                    <div className="md:col-span-3 min-w-0">
                      <label className="block mb-1 text-sm font-medium text-slate-700">
                        Rack <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={r.location}
                        onChange={(e) => handleRackChange(idx, e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        required
                        disabled={!r.item || !r.warehouse}
                      >
                        <option value="">
                          {!r.item || !r.warehouse ? "Select Item + Warehouse first" : "Select Rack"}
                        </option>

                        {(rackOptions[idx] || []).map((loc) => (
                          <option key={loc.locationId} value={loc.locationId}>
                            {loc.location} (Available: {loc.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty */}
                    <div className="md:col-span-1 min-w-0">
                      <label className="block mb-1 text-sm font-medium text-slate-700">
                        Qty <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={r.quantity}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className="w-full border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2"
                >
                  + Add Another Item
                </button>
              </div>

              {/* Purpose + Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700">
                    Purpose <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    required
                  >
                    <option value="">Select Purpose</option>
                    <option value="Sale">Sale</option>
                    <option value="Demo">Demo</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700">
                    Stock Out Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    required
                  />
                </div>

                {purpose === "Demo" ? (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Expected Return Date <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      required
                    />
                  </div>
                ) : (
                  <div className="hidden md:block" />
                )}
              </div>

              {/* Reason + Tender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700">
                    Reason <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700">
                    Tender No. <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={tenderNo}
                    onChange={(e) => setTenderNo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition ${
                  isLoading ? "bg-slate-400 cursor-wait" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isLoading ? "Saving..." : "Save Stock Out"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStockOut;
