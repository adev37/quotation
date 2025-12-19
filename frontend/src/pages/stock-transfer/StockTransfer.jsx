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

const StockTransfer = () => {
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

  const [prevRackMemory, setPrevRackMemory] = useState({});
  const suggestionWrapRef = useRef(null);

  const uniqueLocations = useMemo(() => {
    const seen = new Set();
    return (locations || []).filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });
  }, [locations]);

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
      if (!suggestionWrapRef.current.contains(e.target)) {
        setActiveSuggestion(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

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
      .slice(0, 20); // limit for better UI

    setItemSuggestions(list);
  };

  const handleSelectSuggestion = (s) => {
    setForm((prev) => ({ ...prev, item: s._id }));
    setItemSearch(`${s.name} (${s.modelNo})`);
    setItemSuggestions([]);
    setActiveSuggestion(false);
  };

  // -------- Availability with ID+name match and clamp at 0 --------
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
      setAvailableQty(null);
    } catch (err) {
      toast.error(err?.data?.message || "Transfer failed.");
    }
  };

  return (
    <div className="w-full">
      <ToastContainer position="top-right" />

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
                🔁 Stock Transfer
              </h2>
              <p className="text-sm text-slate-500">
                Select item, source & destination warehouse, optional rack locations, and transfer quantity.
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
                  placeholder="Type name / model no"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  autoComplete="off"
                  required
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

              {/* Quantity */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Quantity <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder={`Qty (Available: ${availableQty ?? "-"})`}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Available stock is calculated from selected warehouse & optional rack.
                </p>
              </div>

              {/* From WH */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  From Warehouse <span className="text-rose-600">*</span>
                </label>
                <select
                  name="fromWarehouse"
                  value={form.fromWarehouse}
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

              {/* From Rack */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  From Rack / Location <span className="text-slate-400">(Optional)</span>
                </label>
                <select
                  name="fromLocation"
                  value={form.fromLocation}
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
              </div>

              {/* To WH */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  To Warehouse <span className="text-rose-600">*</span>
                </label>
                <select
                  name="toWarehouse"
                  value={form.toWarehouse}
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

              {/* To Rack */}
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  To Rack / Location <span className="text-slate-400">(Optional)</span>
                </label>
                <select
                  name="toLocation"
                  value={form.toLocation}
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
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Reason for transfer"
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
                  {saving ? "Transferring..." : "Transfer Stock"}
                </button>
              </div>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              Mobile tip: This form becomes one column on small screens automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTransfer;
