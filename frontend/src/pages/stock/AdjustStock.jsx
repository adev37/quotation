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

const AdjustStock = () => {
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

  const [itemSearch, setItemSearch] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(false);
  const [availableQty, setAvailableQty] = useState(null);

  const [form, setForm] = useState({
    item: "",
    warehouse: "",
    location: "",
    quantity: "",
    action: "IN",
    reason: "",
  });

  const suggestionWrapRef = useRef(null);

  // close suggestions when click outside
  useEffect(() => {
    const onDown = (e) => {
      if (!suggestionWrapRef.current) return;
      if (!suggestionWrapRef.current.contains(e.target)) {
        setActiveSuggestion(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selectedLocationName = useMemo(() => {
    if (!form.location) return "";
    const loc = (locations || []).find((l) => l._id === form.location);
    return loc?.name || "";
  }, [form.location, locations]);

  const uniqueLocations = useMemo(() => {
    const seen = new Set();
    return (locations || []).filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });
  }, [locations]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      // when item/warehouse changes, clear rack selection to avoid mismatch
      ...(name === "item" || name === "warehouse" ? { location: "" } : {}),
    }));
  };

  const handleItemSearch = (value) => {
    setItemSearch(value);
    setActiveSuggestion(true);

    // must clear stored item id until user selects
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
      .slice(0, 20); // limit for UI

    setItemSuggestions(list);
  };

  const handleSelectSuggestion = (s) => {
    setForm((prev) => ({ ...prev, item: s._id, location: "" }));
    setItemSearch(`${s.name} (${s.modelNo})`);
    setItemSuggestions([]);
    setActiveSuggestion(false);
  };

  // -------- Availability (ID + name match, and clamp at 0) --------
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
                r.location.toLowerCase() === selectedLocationName.toLowerCase();
              return sameId || sameName;
            })
          : rows;

        const total = filtered.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

        // never let a negative historical row block you
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

    if (!form.item || !form.warehouse || !form.quantity || !form.reason) {
      toast.error("❗ Please fill in all required fields.");
      return;
    }

    const qtyNum = Number(form.quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("❗ Quantity must be a positive number.");
      return;
    }

    if (form.action === "OUT" && availableQty != null && qtyNum > availableQty) {
      toast.error(`❌ Cannot adjust more than available stock (${availableQty}).`);
      return;
    }

    try {
      await createAdjustment({
        ...form,
        quantity: qtyNum,
        location: form.location || null,
        // send name too for consistent aggregation
        locationName: selectedLocationName || null,
      }).unwrap();

      toast.success("✅ Stock adjusted successfully");

      setForm({
        item: "",
        warehouse: "",
        location: "",
        quantity: "",
        action: "IN",
        reason: "",
      });

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

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                🛠️ Stock Adjustment
              </h2>
              <p className="text-sm text-slate-500">
                Adjust stock IN or OUT for a selected item, warehouse, and optional rack location.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search Item */}
              <div className="relative" ref={suggestionWrapRef}>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Search Item <span className="text-rose-600">*</span>
                </label>

                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => handleItemSearch(e.target.value)}
                  onFocus={() => itemSearch && setActiveSuggestion(true)}
                  placeholder="Type item name / model no"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                  autoComplete="off"
                />

                {itemSearch && activeSuggestion && itemSuggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 bg-white border rounded-xl shadow w-full max-h-56 overflow-auto">
                    {itemSuggestions.map((s) => (
                      <li
                        key={s._id}
                        className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm"
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        <div className="font-medium text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.modelNo}</div>
                      </li>
                    ))}
                  </ul>
                )}

                {itemSearch && activeSuggestion && itemSuggestions.length === 0 && (
                  <div className="absolute z-20 mt-1 bg-white border rounded-xl shadow w-full p-3 text-sm text-slate-500">
                    No items found.
                  </div>
                )}
              </div>

              {/* Warehouse */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Select Warehouse <span className="text-rose-600">*</span>
                </label>
                <select
                  name="warehouse"
                  value={form.warehouse}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {(warehouses || []).map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location (optional) */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Rack / Location <span className="text-slate-400">(Optional)</span>
                </label>
                <select
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">— Optional —</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc._id} value={loc._id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  If selected, available qty will be calculated for this rack only.
                </p>
              </div>

              {/* Action */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Action <span className="text-rose-600">*</span>
                </label>
                <select
                  name="action"
                  value={form.action}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="IN">Increase Stock (IN)</option>
                  <option value="OUT">Decrease Stock (OUT)</option>
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Quantity <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder={`Qty (Available: ${availableQty ?? "-"})`}
                  min="1"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  OUT adjustment cannot exceed available qty.
                </p>
              </div>

              {/* Reason */}
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Reason / Remarks <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Reason for adjustment"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
              </div>

              <div className="md:col-span-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition ${
                    saving ? "bg-slate-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {saving ? "Saving..." : "Adjust Stock"}
                </button>
              </div>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              Mobile tip: form becomes 1-column automatically and the suggestion list is scrollable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustStock;
