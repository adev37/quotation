// src/pages/stock/AddStockIn.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
  useCreateStockInMutation,
} from "../../services/inventoryApi";

const emptyRow = { item: "", warehouse: "", quantity: "", location: "" };

const AddStockIn = () => {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: allWarehouses = [] } = useGetWarehousesQuery();
  const { data: locationsResult = [] } = useGetLocationsQuery();
  const [createStockIn, { isLoading }] = useCreateStockInMutation();

  const allItems = useMemo(() => {
    return Array.isArray(itemsResult)
      ? itemsResult
      : Array.isArray(itemsResult?.items)
      ? itemsResult.items
      : [];
  }, [itemsResult]);

  const allLocations = useMemo(() => {
    return Array.isArray(locationsResult)
      ? locationsResult
      : Array.isArray(locationsResult?.locations)
      ? locationsResult.locations
      : Array.isArray(locationsResult?.data)
      ? locationsResult.data
      : [];
  }, [locationsResult]);

  const [rows, setRows] = useState([emptyRow]);

  // per-row item search UI
  const [itemSearch, setItemSearch] = useState([""]);
  const [itemSuggestions, setItemSuggestions] = useState([[]]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);

  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const suggestionWrapRef = useRef(null);

  // close suggestion dropdown on click outside
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

  const handleRowChange = (idx, e) => {
    const { name, value } = e.target;

    // when warehouse changes -> reset rack
    if (name === "warehouse") updateRow(idx, { warehouse: value, location: "" });
    else updateRow(idx, { [name]: value });
  };

  const getLocationsForWarehouse = (warehouseId) => {
    if (!warehouseId) return [];
    return allLocations.filter((l) => {
      const raw = l?.warehouse ?? l?.warehouseId;
      const locWh = typeof raw === "object" && raw !== null ? raw?._id : raw;
      return String(locWh) === String(warehouseId);
    });
  };

  const handleItemSearchChange = (idx, value) => {
    setActiveSuggestionIdx(idx);

    setItemSearch((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });

    // clear selected item while typing
    updateRow(idx, { item: "" });

    const q = value.trim().toLowerCase();
    if (!q) {
      setItemSuggestions((prev) => {
        const next = [...prev];
        next[idx] = [];
        return next;
      });
      return;
    }

    const list = allItems
      .filter((it) => {
        const n = (it.name || "").toLowerCase();
        const m = (it.modelNo || "").toLowerCase();
        return n.includes(q) || m.includes(q);
      })
      .slice(0, 20);

    setItemSuggestions((prev) => {
      const next = [...prev];
      next[idx] = list;
      return next;
    });
  };

  const handleSelectSuggestion = (idx, s) => {
    updateRow(idx, { item: s._id });

    setItemSearch((prev) => {
      const next = [...prev];
      next[idx] = `${s.name} (${s.modelNo || "-"})`;
      return next;
    });

    setItemSuggestions((prev) => {
      const next = [...prev];
      next[idx] = [];
      return next;
    });

    setActiveSuggestionIdx(null);
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

    if (activeSuggestionIdx === idx) setActiveSuggestionIdx(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleaned = rows.filter((r) => r.item && r.warehouse && r.quantity);
    if (cleaned.length === 0) return toast.error("❌ No valid items to submit.");

    // prevent duplicates item+warehouse+location
    const seen = new Set();
    for (const r of cleaned) {
      const key = `${r.item}|${r.warehouse}|${r.location || "null"}`;
      if (seen.has(key)) return toast.error("❌ Duplicate item + warehouse + rack found.");
      seen.add(key);
    }

    try {
      await createStockIn({
        items: cleaned.map((x) => ({
          item: x.item,
          warehouse: x.warehouse,
          location: x.location || null,
          quantity: Number(x.quantity),
        })),
        date,
        remarks,
      }).unwrap();

      toast.success("✅ Stock In recorded!");
      setRows([emptyRow]);
      setItemSearch([""]);
      setItemSuggestions([[]]);
      setActiveSuggestionIdx(null);
      setDate("");
      setRemarks("");
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to record stock in.");
    }
  };

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                📥 Stock In
              </h2>
              <p className="text-sm text-slate-500">
                Add multiple items in one stock-in entry. On mobile, fields stack automatically.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div ref={suggestionWrapRef} className="space-y-4">
                {rows.map((r, idx) => {
                  const racks = getLocationsForWarehouse(r.warehouse);

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border p-3 sm:p-4 bg-slate-50/40"
                    >
                      {/* Row header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="text-sm font-semibold text-slate-800">
                          Item Row #{idx + 1}
                        </div>

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

                      {/* Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        {/* Item Search */}
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
                            required
                            autoComplete="off"
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
                            name="warehouse"
                            value={r.warehouse}
                            onChange={(e) => handleRowChange(idx, e)}
                            required
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          >
                            <option value="">Select Warehouse</option>
                            {allWarehouses.map((w) => (
                              <option key={w._id} value={w._id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Rack */}
                        <div className="md:col-span-3 min-w-0">
                          <label className="block mb-1 text-sm font-medium text-slate-700">
                            Rack <span className="text-slate-400">(Optional)</span>
                          </label>
                          <select
                            name="location"
                            value={r.location}
                            onChange={(e) => handleRowChange(idx, e)}
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            disabled={!r.warehouse}
                          >
                            <option value="">
                              {!r.warehouse ? "Select Warehouse first" : "Select Rack"}
                            </option>
                            {r.warehouse && racks.length === 0 && (
                              <option value="" disabled>
                                No racks found for this warehouse
                              </option>
                            )}
                            {racks.map((l) => (
                              <option key={l._id} value={l._id}>
                                {l.name}
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
                            name="quantity"
                            type="number"
                            min={1}
                            value={r.quantity}
                            onChange={(e) => handleRowChange(idx, e)}
                            className="w-full border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2"
                >
                  + Add Another Item
                </button>
              </div>

              {/* Date + Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700">
                    Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700">
                    Remarks
                  </label>
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Optional remarks"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition ${
                  isLoading ? "bg-slate-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isLoading ? "Saving..." : "💾 Save Stock In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStockIn;
