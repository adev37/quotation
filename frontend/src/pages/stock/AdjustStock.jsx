// src/pages/stock/AdjustStock.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
  useLazyGetCurrentStockQuery,
  useCreateAdjustmentMutation,
} from "../../services/inventoryApi";

const initialForm = {
  item: "",
  warehouse: "",
  location: "",
  quantity: "",
  action: "IN",
  reason: "",
};

export default function AdjustStock() {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: locations = [] } = useGetLocationsQuery();

  const [triggerGetCurrentStock] = useLazyGetCurrentStockQuery();
  const [createAdjustment, { isLoading: saving }] = useCreateAdjustmentMutation();

  const items = useMemo(() => {
    return Array.isArray(itemsResult)
      ? itemsResult
      : Array.isArray(itemsResult?.items)
      ? itemsResult.items
      : [];
  }, [itemsResult]);

  // ---------- Typeahead ----------
  const [itemSearch, setItemSearch] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(false);
  const suggestionWrapRef = useRef(null);

  const [availableQty, setAvailableQty] = useState(null);

  const [form, setForm] = useState(initialForm);

  // close suggestions on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!suggestionWrapRef.current) return;
      if (!suggestionWrapRef.current.contains(e.target)) setActiveSuggestion(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const uniqueLocations = useMemo(() => {
    const seen = new Set();
    return (locations || []).filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });
  }, [locations]);

  const selectedLocationName = useMemo(() => {
    if (!form.location) return "";
    const loc = (locations || []).find((l) => l._id === form.location);
    return loc?.name || "";
  }, [form.location, locations]);

  const canSubmit = useMemo(() => {
    const qty = Number(form.quantity);
    return (
      Boolean(form.item) &&
      Boolean(form.warehouse) &&
      Boolean(String(form.reason || "").trim()) &&
      Number.isFinite(qty) &&
      qty > 0 &&
      (form.action !== "OUT" || availableQty == null || qty <= availableQty)
    );
  }, [form.item, form.warehouse, form.reason, form.quantity, form.action, availableQty]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "item" || name === "warehouse" ? { location: "" } : {}),
    }));
  };

  const handleItemSearch = (value) => {
    setItemSearch(value);
    setActiveSuggestion(true);

    // clear item id until user selects a suggestion
    setForm((prev) => ({ ...prev, item: "", location: "" }));

    const q = value.trim().toLowerCase();
    if (!q) {
      setItemSuggestions([]);
      return;
    }

    const list = items
      .filter((it) => {
        const n = (it.name || "").toLowerCase();
        const m = (it.modelNo || "").toLowerCase();
        return n.includes(q) || m.includes(q);
      })
      .slice(0, 20);

    setItemSuggestions(list);
  };

  const handleSelectSuggestion = (s) => {
    setForm((prev) => ({ ...prev, item: s._id, location: "" }));
    setItemSearch(`${s.name} (${s.modelNo || "-"})`);
    setItemSuggestions([]);
    setActiveSuggestion(false);
  };

  // -------- Availability (ID + name match, clamp at 0) --------
  useEffect(() => {
    const calc = async () => {
      const { item, warehouse, location } = form;

      if (!item || !warehouse) {
        setAvailableQty(null);
        return;
      }

      try {
        const data = await triggerGetCurrentStock(
          `item=${encodeURIComponent(item)}&warehouse=${encodeURIComponent(warehouse)}`
        ).unwrap();

        const rows = Array.isArray(data) ? data : [];

        const filtered = location
          ? rows.filter((r) => {
              const sameId = r.locationId === location;
              const sameName =
                r.location &&
                selectedLocationName &&
                String(r.location).toLowerCase() === String(selectedLocationName).toLowerCase();
              return sameId || sameName;
            })
          : rows;

        const total = filtered.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
        setAvailableQty(Math.max(total, 0));
      } catch {
        setAvailableQty(null);
        toast.error("⚠️ Couldn't fetch available stock.");
      }
    };

    calc();
  }, [form.item, form.warehouse, form.location, triggerGetCurrentStock, selectedLocationName]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit || saving) {
      toast.error("❗ Please fill in all required fields.");
      return;
    }

    const qtyNum = Number(form.quantity);

    try {
      await createAdjustment({
        ...form,
        quantity: qtyNum,
        location: form.location || null,
        locationName: selectedLocationName || null,
        reason: String(form.reason || "").trim(),
      }).unwrap();

      toast.success("✅ Stock adjusted successfully");

      setForm(initialForm);
      setItemSearch("");
      setAvailableQty(null);
      setItemSuggestions([]);
      setActiveSuggestion(false);
    } catch (err) {
      toast.error(err?.data?.message || "❌ Failed to adjust stock.");
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
                    🛠️
                  </span>
                  Stock Adjustment
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Adjust stock IN/OUT for an item, warehouse, and optional rack.
                </p>
              </div>

              <span
                className={[
                  "shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                  canSubmit
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-600 border-slate-200",
                ].join(" ")}
              >
                {canSubmit ? "Ready" : "Incomplete"}
              </span>
            </div>

            {/* Quick meta */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Available</div>
                <div className="text-sm font-semibold text-slate-900">
                  {availableQty == null ? "—" : availableQty}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Action</div>
                <div className="text-sm font-semibold text-slate-900">
                  {form.action === "OUT" ? "Decrease (OUT)" : "Increase (IN)"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Rack</div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {selectedLocationName || "All"}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Search Item */}
              <div className="relative" ref={suggestionWrapRef}>
                <Field
                  label="Search Item"
                  hint="Type item name or model number"
                  required
                >
                  <TextInput
                    value={itemSearch}
                    onChange={(e) => handleItemSearch(e.target.value)}
                    onFocus={() => itemSearch && setActiveSuggestion(true)}
                    placeholder="Search item..."
                    autoComplete="off"
                  />
                </Field>

                {itemSearch && activeSuggestion && (
                  <div className="absolute z-30 mt-2 w-full">
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                      <div className="max-h-64 overflow-auto">
                        {itemSuggestions.length > 0 ? (
                          <ul className="divide-y divide-slate-100">
                            {itemSuggestions.map((s) => (
                              <li
                                key={s._id}
                                className="px-3 py-2 cursor-pointer hover:bg-indigo-50"
                                onClick={() => handleSelectSuggestion(s)}
                              >
                                <div className="text-sm font-semibold text-slate-900">
                                  {s.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {s.modelNo || "—"}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="px-3 py-3 text-sm text-slate-500">
                            No items found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Warehouse */}
              <Field label="Warehouse" hint="Select where you want to adjust stock" required>
                <Select
                  name="warehouse"
                  value={form.warehouse}
                  onChange={handleChange}
                >
                  <option value="">Select Warehouse</option>
                  {(warehouses || []).map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Location */}
              <Field label="Rack / Location" hint="Optional">
                <Select
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                >
                  <option value="">— Optional —</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc._id} value={loc._id}>
                      {loc.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Action */}
              <Field label="Action" hint="Choose IN or OUT" required>
                <Select name="action" value={form.action} onChange={handleChange}>
                  <option value="IN">Increase Stock (IN)</option>
                  <option value="OUT">Decrease Stock (OUT)</option>
                </Select>
              </Field>

              {/* Quantity */}
              <Field label="Quantity" hint={form.action === "OUT" ? "Cannot exceed available quantity" : ""} required>
                <TextInput
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  min="1"
                />
              </Field>

              {/* Reason */}
              <Field
                label="Reason / Remarks"
                hint="Example: Stock correction, damaged items, audit adjustment"
                required
              >
                <TextInput
                  type="text"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Enter reason"
                />
              </Field>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setItemSearch("");
                  setAvailableQty(null);
                  setItemSuggestions([]);
                  setActiveSuggestion(false);
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={saving}
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={!canSubmit || saving}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                  !canSubmit || saving
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700",
                ].join(" ")}
              >
                {saving ? "Saving..." : "Adjust Stock"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

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
