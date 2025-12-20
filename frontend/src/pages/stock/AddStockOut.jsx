// src/pages/stock/AddStockOut.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

  const allItems = useMemo(() => {
    return Array.isArray(itemsResult)
      ? itemsResult
      : Array.isArray(itemsResult?.items)
      ? itemsResult.items
      : [];
  }, [itemsResult]);

  const [rows, setRows] = useState([emptyRow]);

  // per-row search UI
  const [itemSearch, setItemSearch] = useState([""]);
  const [itemSuggestions, setItemSuggestions] = useState([[]]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);

  // rack options per row: { [idx]: [{locationId, location, quantity}] }
  const [rackOptions, setRackOptions] = useState({});

  const [purpose, setPurpose] = useState("");
  const [reason, setReason] = useState("");
  const [tenderNo, setTenderNo] = useState("");
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  const suggestionWrapRef = useRef(null);

  // close suggestions when click outside
  useEffect(() => {
    const onDown = (e) => {
      if (!suggestionWrapRef.current) return;
      if (!suggestionWrapRef.current.contains(e.target)) setActiveSuggestionIdx(null);
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

  const hasValidRows = useMemo(() => {
    return rows.some(
      (r) => r.item && r.warehouse && r.location && Number(r.quantity) > 0
    );
  }, [rows]);

  const isReady = useMemo(() => {
    if (!hasValidRows) return false;
    if (!purpose || !date || !reason) return false;
    if (purpose === "Demo" && !returnDate) return false;
    return true;
  }, [hasValidRows, purpose, date, reason, returnDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.item) return toast.error(`Row ${i + 1}: Select item`);
      if (!r.warehouse) return toast.error(`Row ${i + 1}: Select warehouse`);
      if (!r.location) return toast.error(`Row ${i + 1}: Select rack/location`);
      if (!r.quantity || Number(r.quantity) <= 0)
        return toast.error(`Row ${i + 1}: Enter valid quantity`);
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
      <ToastContainer position="top-right" autoClose={4000} />

      <div className="mx-auto w-full max-w-[1100px]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-rose-50 via-white to-white border-b border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
                    📤
                  </span>
                  Stock Out
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Select rack based on available stock.
                </p>
              </div>

              <span
                className={[
                  "shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                  isReady
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-600 border-slate-200",
                ].join(" ")}
              >
                {isReady ? "Ready" : "Incomplete"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-6" ref={suggestionWrapRef}>
            <div className="space-y-4">
              {rows.map((r, idx) => (
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

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Search Item */}
                    <div className="md:col-span-5 relative min-w-0">
                      <Field label="Search Item" required hint="Type item name or model number">
                        <TextInput
                          value={itemSearch[idx] || ""}
                          onChange={(e) => handleItemSearchChange(idx, e.target.value)}
                          onFocus={() =>
                            (itemSearch[idx] || "").trim() && setActiveSuggestionIdx(idx)
                          }
                          placeholder="Search item..."
                          autoComplete="off"
                          required
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
                                    className="px-3 py-2 cursor-pointer hover:bg-rose-50"
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

                      {activeSuggestionIdx === idx && (itemSuggestions[idx] || []).length === 0 && (itemSearch[idx] || "").trim() && (
                        <div className="absolute z-30 mt-2 w-full">
                          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-3 text-sm text-slate-500">
                            No items found.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Warehouse */}
                    <div className="md:col-span-3 min-w-0">
                      <Field label="Warehouse" required hint="Select warehouse">
                        <Select
                          value={r.warehouse}
                          onChange={(e) => handleWarehouseChange(idx, e.target.value)}
                          required
                        >
                          <option value="">Select Warehouse</option>
                          {(allWarehouses || []).map((w) => (
                            <option key={w._id} value={w._id}>
                              {w.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    {/* Rack */}
                    <div className="md:col-span-3 min-w-0">
                      <Field label="Rack / Location" required hint="Shows only racks with stock">
                        <Select
                          value={r.location}
                          onChange={(e) => handleRackChange(idx, e.target.value)}
                          required
                          disabled={!r.item || !r.warehouse}
                        >
                          <option value="">
                            {!r.item || !r.warehouse
                              ? "Select Item + Warehouse first"
                              : "Select Rack"}
                          </option>

                          {(rackOptions[idx] || []).map((loc) => (
                            <option key={loc.locationId} value={loc.locationId}>
                              {loc.location} (Available: {loc.quantity})
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    {/* Qty */}
                    <div className="md:col-span-1 min-w-0">
                      <Field label="Qty" hint="Required" required>
                        <TextInput
                          type="number"
                          min={1}
                          value={r.quantity}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          required
                          className="text-center"
                          placeholder="0"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add row */}
            <div className="mt-4">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm"
              >
                + Add Another Item
              </button>
            </div>

            {/* Purpose + Dates */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Purpose" required>
                <Select value={purpose} onChange={(e) => setPurpose(e.target.value)} required>
                  <option value="">Select Purpose</option>
                  <option value="Sale">Sale</option>
                  <option value="Demo">Demo</option>
                </Select>
              </Field>

              <Field label="Stock Out Date" required>
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>

              {purpose === "Demo" ? (
                <Field label="Expected Return Date" required>
                  <TextInput
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                  />
                </Field>
              ) : (
                <div className="hidden md:block" />
              )}
            </div>

            {/* Reason + Tender */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Reason / Remarks" hint="Required" required>
                <TextInput value={reason} onChange={(e) => setReason(e.target.value)} required />
              </Field>

              <Field label="Tender No." hint="Optional">
                <TextInput value={tenderNo} onChange={(e) => setTenderNo(e.target.value)} />
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
                  setRackOptions({});
                  setActiveSuggestionIdx(null);
                  setPurpose("");
                  setReason("");
                  setTenderNo("");
                  setDate("");
                  setReturnDate("");
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={isLoading}
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={isLoading || !isReady}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                  isLoading || !isReady
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-700",
                ].join(" ")}
              >
                {isLoading ? "Saving..." : "Save Stock Out"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddStockOut;

/* ---------- Small UI helpers (same style you used in StockIn) ---------- */
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
        "focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500",
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
        "focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </select>
  );
}
