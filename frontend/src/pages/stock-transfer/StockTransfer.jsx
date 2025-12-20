// src/pages/transfers/StockTransfer.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useGetLocationsQuery,
  useLazyGetCurrentStockQuery,
  useCreateTransferMutation,
} from "../../services/inventoryApi";

export default function StockTransfer() {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: locations = [] } = useGetLocationsQuery();

  const [triggerGetCurrentStock] = useLazyGetCurrentStockQuery();
  const [createTransfer, { isLoading: saving }] = useCreateTransferMutation();

  const items = useMemo(() => {
    return Array.isArray(itemsResult)
      ? itemsResult
      : Array.isArray(itemsResult?.items)
      ? itemsResult.items
      : [];
  }, [itemsResult]);

  // Unique racks by name (like your other pages)
  const uniqueLocations = useMemo(() => {
    const seen = new Set();
    return (locations || []).filter((loc) => {
      const name = String(loc?.name || "").trim();
      if (!name) return false;
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [locations]);

  const [itemSearch, setItemSearch] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(false);

  const [availableQty, setAvailableQty] = useState(null);

  const [form, setForm] = useState({
    item: "",
    fromWarehouse: "",
    toWarehouse: "",
    fromLocation: "",
    toLocation: "",
    quantity: "",
    reason: "",
  });

  // remember previously selected rack per fromWarehouse
  const [prevRackMemory, setPrevRackMemory] = useState({});
  const suggestionWrapRef = useRef(null);

  const selectedFromLocName = useMemo(() => {
    if (!form.fromLocation) return "";
    const loc = (locations || []).find((l) => l._id === form.fromLocation);
    return loc?.name || "";
  }, [form.fromLocation, locations]);

  const selectedToLocName = useMemo(() => {
    if (!form.toLocation) return "";
    const loc = (locations || []).find((l) => l._id === form.toLocation);
    return loc?.name || "";
  }, [form.toLocation, locations]);

  // close suggestions when click outside
  useEffect(() => {
    const onDown = (e) => {
      if (!suggestionWrapRef.current) return;
      if (!suggestionWrapRef.current.contains(e.target)) setActiveSuggestion(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // restore last "fromLocation" per fromWarehouse
    if (name === "fromWarehouse") {
      setPrevRackMemory((prev) => ({
        ...prev,
        [form.fromWarehouse]: form.fromLocation,
      }));

      const restored = prevRackMemory[value] || "";
      setForm((prev) => ({
        ...prev,
        fromWarehouse: value,
        fromLocation: restored,
      }));
      return;
    }

    if (name === "toWarehouse" && value === form.fromWarehouse) {
      toast.warn("⚠️ Source and destination cannot be the same.");
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemSearch = (value) => {
    setItemSearch(value);
    setActiveSuggestion(true);

    // clear selected item until user selects
    setForm((prev) => ({ ...prev, item: "" }));

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
    setForm((prev) => ({ ...prev, item: s._id }));
    setItemSearch(`${s.name} (${s.modelNo || "—"})`);
    setItemSuggestions([]);
    setActiveSuggestion(false);
  };

  // availability (from warehouse + optional rack)
  useEffect(() => {
    const fetchAvail = async () => {
      const { item, fromWarehouse, fromLocation } = form;

      if (!item || !fromWarehouse) {
        setAvailableQty(null);
        return;
      }

      try {
        const data = await triggerGetCurrentStock(
          `item=${encodeURIComponent(item)}&warehouse=${encodeURIComponent(fromWarehouse)}`
        ).unwrap();

        const rows = Array.isArray(data) ? data : [];

        const filtered = fromLocation
          ? rows.filter((r) => {
              const sameId = r.locationId === fromLocation;
              const sameName =
                r.location &&
                selectedFromLocName &&
                r.location.toLowerCase() === selectedFromLocName.toLowerCase();
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

    fetchAvail();
  }, [
    form.item,
    form.fromWarehouse,
    form.fromLocation,
    triggerGetCurrentStock,
    selectedFromLocName,
  ]);

  const resetForm = () => {
    setForm({
      item: "",
      fromWarehouse: "",
      toWarehouse: "",
      fromLocation: "",
      toLocation: "",
      quantity: "",
      reason: "",
    });
    setItemSearch("");
    setItemSuggestions([]);
    setActiveSuggestion(false);
    setAvailableQty(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { item, fromWarehouse, toWarehouse, quantity, reason } = form;

    if (!item || !fromWarehouse || !toWarehouse || !quantity || !reason) {
      toast.error("⚠️ Please fill all required fields.");
      return;
    }

    if (fromWarehouse === toWarehouse) {
      toast.error("⚠️ Source and destination warehouse cannot be the same.");
      return;
    }

    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("⚠️ Quantity must be a positive number.");
      return;
    }

    if (availableQty != null && qtyNum > availableQty) {
      toast.error(`❌ Quantity exceeds available stock (${availableQty}).`);
      return;
    }

    try {
      await createTransfer({
        ...form,
        quantity: qtyNum,
        date: new Date(),
        fromLocation: form.fromLocation || null,
        toLocation: form.toLocation || null,
        fromLocationName: selectedFromLocName || null,
        toLocationName: selectedToLocName || null,
      }).unwrap();

      toast.success("✅ Transfer completed.");
      resetForm();
    } catch (err) {
      toast.error(err?.data?.message || "Transfer failed.");
    }
  };

  return (
    <div className="w-full">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* SAME OUTER CARD LOOK LIKE YOUR STOCK IN SCREENSHOT */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-white border-b border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  🔁
                </span>
                Stock Transfer
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Transfer item stock from one warehouse to another (optional rack-wise).
              </p>
            </div>

            <span className="shrink-0 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              Incomplete
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Main row card (like Stock In row box) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-800 mb-3">
                Transfer Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Search Item */}
                <div className="md:col-span-5 relative min-w-0" ref={suggestionWrapRef}>
                  <FieldLabel label="Search Item" required hint="Type item name or model number" />

                  <TextInput
                    value={itemSearch}
                    onChange={(e) => handleItemSearch(e.target.value)}
                    onFocus={() => itemSearch && setActiveSuggestion(true)}
                    placeholder="Search item..."
                    autoComplete="off"
                    required
                  />

                  {itemSearch && activeSuggestion && itemSuggestions.length > 0 && (
                    <ul className="absolute z-20 mt-1 bg-white border border-slate-200 rounded-2xl shadow w-full max-h-56 overflow-auto">
                      {itemSuggestions.map((s) => (
                        <li
                          key={s._id}
                          className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm"
                          onClick={() => handleSelectSuggestion(s)}
                        >
                          <div className="font-medium text-slate-900">{s.name}</div>
                          <div className="text-xs text-slate-500">{s.modelNo || "—"}</div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {itemSearch && activeSuggestion && itemSuggestions.length === 0 && (
                    <div className="absolute z-20 mt-1 bg-white border border-slate-200 rounded-2xl shadow w-full p-3 text-sm text-slate-500">
                      No items found.
                    </div>
                  )}
                </div>

                {/* From Warehouse */}
                <div className="md:col-span-3 min-w-0">
                  <FieldLabel label="From Warehouse" required hint="Select warehouse" />
                  <Select
                    name="fromWarehouse"
                    value={form.fromWarehouse}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {(warehouses || []).map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* From Rack */}
                <div className="md:col-span-3 min-w-0">
                  <FieldLabel label="From Rack" hint="Optional" />
                  <Select
                    name="fromLocation"
                    value={form.fromLocation}
                    onChange={handleChange}
                    disabled={!form.fromWarehouse}
                  >
                    <option value="">
                      {!form.fromWarehouse ? "Select Warehouse first" : "Select Rack (Optional)"}
                    </option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Qty */}
                <div className="md:col-span-1 min-w-0">
                  <FieldLabel label="Qty" required hint="Required" />
                  <TextInput
                    type="number"
                    name="quantity"
                    min={1}
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="0"
                    required
                    className="text-center"
                  />
                </div>

                {/* To Warehouse */}
                <div className="md:col-span-3 min-w-0">
                  <FieldLabel label="To Warehouse" required hint="Select warehouse" />
                  <Select
                    name="toWarehouse"
                    value={form.toWarehouse}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {(warehouses || []).map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* To Rack */}
                <div className="md:col-span-3 min-w-0">
                  <FieldLabel label="To Rack" hint="Optional" />
                  <Select
                    name="toLocation"
                    value={form.toLocation}
                    onChange={handleChange}
                    disabled={!form.toWarehouse}
                  >
                    <option value="">
                      {!form.toWarehouse ? "Select Warehouse first" : "Select Rack (Optional)"}
                    </option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Available Info */}
                <div className="md:col-span-6 min-w-0 flex items-end">
                  <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs text-slate-600">Available Stock</div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                      {availableQty ?? "—"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Based on “From Warehouse” and optional “From Rack”.
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="md:col-span-12 min-w-0">
                  <FieldLabel label="Reason" required hint="Required" />
                  <TextInput
                    type="text"
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    placeholder="Reason for transfer"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Bottom action bar like screenshot */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={saving}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white",
                  saving ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700",
                ].join(" ")}
              >
                {saving ? "Transferring..." : "💾 Transfer Stock"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI helpers (same style you used in ItemList) ---------- */
function FieldLabel({ label, required, hint }) {
  return (
    <div className="mb-1">
      <div className="text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </div>
      {hint ? <div className="text-xs text-slate-500 mt-0.5">{hint}</div> : null}
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
