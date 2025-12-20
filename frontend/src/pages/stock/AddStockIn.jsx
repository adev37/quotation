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
      if (!suggestionWrapRef.current.contains(e.target)) setActiveSuggestionIdx(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const getLocationsForWarehouse = (warehouseId) => {
    if (!warehouseId) return [];
    return allLocations.filter((l) => {
      const raw = l?.warehouse ?? l?.warehouseId;
      const locWh = typeof raw === "object" && raw !== null ? raw?._id : raw;
      return String(locWh) === String(warehouseId);
    });
  };

  const updateRow = (idx, patch) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleRowChange = (idx, e) => {
    const { name, value } = e.target;
    if (name === "warehouse") updateRow(idx, { warehouse: value, location: "" });
    else updateRow(idx, { [name]: value });
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

  const hasValidRows = useMemo(() => {
    return rows.some((r) => r.item && r.warehouse && Number(r.quantity) > 0);
  }, [rows]);

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

      <div className="mx-auto w-full max-w-[1100px]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                    📥
                  </span>
                  Stock In
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Add multiple items in one stock-in entry.
                </p>
              </div>

              <span
                className={[
                  "shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                  hasValidRows && date
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-600 border-slate-200",
                ].join(" ")}
              >
                {hasValidRows && date ? "Ready" : "Incomplete"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-6">
            <div ref={suggestionWrapRef} className="space-y-4">
              {rows.map((r, idx) => {
                const racks = getLocationsForWarehouse(r.warehouse);

                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4"
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
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Item Search */}
                      <div className="md:col-span-5 relative min-w-0">
                        <Field label="Search Item" required hint="Type item name or model number">
                          <TextInput
                            value={itemSearch[idx] || ""}
                            onChange={(e) => handleItemSearchChange(idx, e.target.value)}
                            onFocus={() =>
                              (itemSearch[idx] || "").trim() && setActiveSuggestionIdx(idx)
                            }
                            placeholder="Search item..."
                            required
                            autoComplete="off"
                          />
                        </Field>

                        {activeSuggestionIdx === idx && (itemSuggestions[idx] || []).length > 0 && (
                          <div className="absolute z-30 mt-2 w-full">
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                              <div className="max-h-64 overflow-auto">
                                <ul className="divide-y divide-slate-100">
                                  {itemSuggestions[idx].map((s) => (
                                    <li
                                      key={s._id}
                                      className="px-3 py-2 cursor-pointer hover:bg-indigo-50"
                                      onClick={() => handleSelectSuggestion(idx, s)}
                                    >
                                      <div className="text-sm font-semibold text-slate-900">
                                        {s.name}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {s.modelNo || "-"}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Warehouse */}
                      <div className="md:col-span-3 min-w-0">
                        <Field label="Warehouse" required hint="Select warehouse">
                          <Select
                            name="warehouse"
                            value={r.warehouse}
                            onChange={(e) => handleRowChange(idx, e)}
                            required
                          >
                            <option value="">Select Warehouse</option>
                            {allWarehouses.map((w) => (
                              <option key={w._id} value={w._id}>
                                {w.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>

                      {/* Rack */}
                      <div className="md:col-span-3 min-w-0">
                        <Field label="Rack" hint="Optional">
                          <Select
                            name="location"
                            value={r.location}
                            onChange={(e) => handleRowChange(idx, e)}
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
                          </Select>
                        </Field>
                      </div>

                      {/* Qty */}
                      <div className="md:col-span-1 min-w-0">
                        <Field label="Qty" hint="Required" required>
                          <TextInput
                            name="quantity"
                            type="number"
                            min={1}
                            value={r.quantity}
                            onChange={(e) => handleRowChange(idx, e)}
                            required
                            className="text-center"
                            placeholder="0"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm"
              >
                + Add Another Item
              </button>
            </div>

            {/* Date + Remarks */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Date" hint="Required" required>
                <TextInput
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>

              <Field label="Remarks" hint="Optional">
                <TextInput
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks"
                />
              </Field>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRows([emptyRow]);
                  setItemSearch([""]);
                  setItemSuggestions([[]]);
                  setActiveSuggestionIdx(null);
                  setDate("");
                  setRemarks("");
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={isLoading}
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={isLoading || !hasValidRows || !date}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                  isLoading || !hasValidRows || !date
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700",
                ].join(" ")}
              >
                {isLoading ? "Saving..." : "💾 Save Stock In"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddStockIn;

function Field({ label, hint, required, children }) {
  return (
    <div className="min-w-0">
      <label className="block text-xs sm:text-sm font-semibold text-slate-800">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </label>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

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
